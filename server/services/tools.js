/**
 * Tools Service
 * Defines Gemini function-calling tool declarations, executes tools, and logs calls.
 * Tools operate within workspace scope — every action is workspace-isolated.
 */

const supabase = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// ─── Tool Definitions (Gemini Function Declarations) ─────────────────────────

const TOOL_DEFINITIONS = [
  {
    name: 'save_task',
    description:
      'Saves a new task to the active workspace. Use when the user asks to create, add, or save a task or to-do item.',
    parameters: {
      type: 'OBJECT',
      properties: {
        title: {
          type: 'STRING',
          description: 'The title or name of the task',
        },
        description: {
          type: 'STRING',
          description: 'Optional detailed description of the task',
        },
        priority: {
          type: 'STRING',
          description: 'Priority level of the task',
          enum: ['low', 'medium', 'high'],
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'list_tasks',
    description:
      'Lists tasks in the active workspace. Use when the user asks to see, list, or show tasks or to-dos.',
    parameters: {
      type: 'OBJECT',
      properties: {
        status: {
          type: 'STRING',
          description: 'Optional filter by task status',
          enum: ['todo', 'in_progress', 'done'],
        },
      },
      required: [],
    },
  },
  {
    name: 'send_notification',
    description:
      'Sends a notification message. Use when the user asks to notify, alert, or send a message to a channel.',
    parameters: {
      type: 'OBJECT',
      properties: {
        message: {
          type: 'STRING',
          description: 'The notification message content',
        },
        channel: {
          type: 'STRING',
          description: 'The channel to send to (default: general)',
        },
      },
      required: ['message'],
    },
  },
];

// ─── Tool Execution ──────────────────────────────────────────────────────────

/**
 * Execute a named tool with validated arguments.
 * All tool executions are logged to the tool_call_logs table.
 *
 * @param {string} toolName - Name of the tool to execute
 * @param {object} args - Arguments for the tool
 * @param {object} context - Execution context: { workspaceId, userId, supabase }
 * @returns {Promise<object>} Result object from the tool
 */
async function executeTool(toolName, args, context) {
  const { workspaceId, userId } = context;
  let result;
  let status = 'success';

  try {
    switch (toolName) {
      case 'save_task':
        result = await executeSaveTask(args, workspaceId, userId);
        break;

      case 'list_tasks':
        result = await executeListTasks(args, workspaceId);
        break;

      case 'send_notification':
        result = await executeSendNotification(args);
        break;

      default:
        status = 'error';
        result = { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    status = 'error';
    result = { error: `Tool execution failed: ${error.message}` };
  }

  // Log the tool call to tool_call_logs table
  await logToolCall(toolName, args, result, status, workspaceId, userId);

  return result;
}

// ─── Individual Tool Implementations ─────────────────────────────────────────

/**
 * Save a new task to the tasks table in the active workspace.
 */
async function executeSaveTask(args, workspaceId, userId) {
  // Validate required argument
  if (!args.title || typeof args.title !== 'string' || args.title.trim() === '') {
    return { error: 'Invalid arguments: title is required and must be a non-empty string' };
  }

  const validPriorities = ['low', 'medium', 'high'];
  const priority = args.priority && validPriorities.includes(args.priority)
    ? args.priority
    : 'medium';

  const taskData = {
    id: uuidv4(),
    workspace_id: workspaceId,
    title: args.title.trim(),
    description: args.description || null,
    priority,
    status: 'todo',
    created_by: userId,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('tasks')
    .insert(taskData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to save task: ${error.message}`);
  }

  return { success: true, task: data };
}

/**
 * List tasks in the workspace, optionally filtered by status.
 */
async function executeListTasks(args, workspaceId) {
  let query = supabase
    .from('tasks')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  // Apply optional status filter
  const validStatuses = ['todo', 'in_progress', 'done'];
  if (args.status && validStatuses.includes(args.status)) {
    query = query.eq('status', args.status);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to list tasks: ${error.message}`);
  }

  return { tasks: data || [] };
}

/**
 * Send a notification — uses Discord webhook if configured, otherwise logs it.
 */
async function executeSendNotification(args) {
  // Validate required argument
  if (!args.message || typeof args.message !== 'string' || args.message.trim() === '') {
    return { error: 'Invalid arguments: message is required and must be a non-empty string' };
  }

  const message = args.message.trim();
  const channel = args.channel || 'general';

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

  if (webhookUrl) {
    try {
      // POST to Discord webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `[${channel}] ${message}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`Discord webhook returned ${response.status}`);
      }

      return {
        success: true,
        note: `Notification sent to Discord channel: ${channel}`,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to send Discord notification: ${error.message}`,
      };
    }
  }

  // No webhook configured — just log it
  console.log(`[Notification] [${channel}] ${message}`);
  return {
    success: true,
    note: 'Notification logged (no webhook configured)',
  };
}

// ─── Tool Call Logging ───────────────────────────────────────────────────────

/**
 * Log a tool call to the tool_call_logs table for audit and debugging.
 */
async function logToolCall(toolName, args, result, status, workspaceId, userId) {
  try {
    await supabase.from('tool_call_logs').insert({
      id: uuidv4(),
      workspace_id: workspaceId,
      user_id: userId,
      tool_name: toolName,
      arguments: args,
      result,
      status,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Don't throw — logging failure shouldn't break the tool execution flow
    console.error('Failed to log tool call:', error.message);
  }
}

module.exports = { TOOL_DEFINITIONS, executeTool };
