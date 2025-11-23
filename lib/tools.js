// Tool execution module for Grok CLI
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { exec } = require('child_process');
const { promisify } = require('util');
const { ShellManager } = require('./shell');
const { TaskManager, TaskStatus } = require('./agent');

const execAsync = promisify(exec);

// Define available tools
const TOOL_DEFINITIONS = [
    {
        type: 'function',
        function: {
            name: 'read_file',
            description: 'Read contents of a file',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path to the file' }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'write_file',
            description: 'Write content to a file',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path to the file' },
                    content: { type: 'string', description: 'Content to write' }
                },
                required: ['path', 'content']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'edit_file',
            description: 'Edit a file by replacing text',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path to the file' },
                    search: { type: 'string', description: 'Text to search for' },
                    replace: { type: 'string', description: 'Text to replace with' }
                },
                required: ['path', 'search', 'replace']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'list_directory',
            description: 'List contents of a directory',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path to the directory' },
                    recursive: { type: 'boolean', description: 'List recursively' }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'create_directory',
            description: 'Create a new directory',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path for the new directory' }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'delete_file',
            description: 'Delete a file or directory',
            parameters: {
                type: 'object',
                properties: {
                    path: { type: 'string', description: 'Path to delete' }
                },
                required: ['path']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'run_command',
            description: 'Execute a shell command in a persistent session. Supports cd, pwd, and maintains working directory state. Use timeout for long-running commands or background:true for async execution.',
            parameters: {
                type: 'object',
                properties: {
                    command: { type: 'string', description: 'Command to execute (bash syntax)' },
                    cwd: { type: 'string', description: 'Working directory (optional, session maintains state)' },
                    timeout: { type: 'number', description: 'Timeout in milliseconds (default: 120000)' },
                    background: { type: 'boolean', description: 'Run in background (default: false)' },
                    streaming: { type: 'boolean', description: 'Stream output in real-time (default: false)' }
                },
                required: ['command']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_shell_cwd',
            description: 'Get the current working directory of the shell session',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'list_background_processes',
            description: 'List all background shell processes',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_background_output',
            description: 'Get output from a background process',
            parameters: {
                type: 'object',
                properties: {
                    processId: { type: 'string', description: 'Background process ID' }
                },
                required: ['processId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'kill_background_process',
            description: 'Kill a background process',
            parameters: {
                type: 'object',
                properties: {
                    processId: { type: 'string', description: 'Background process ID to kill' }
                },
                required: ['processId']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'http_request',
            description: 'Make an HTTP request',
            parameters: {
                type: 'object',
                properties: {
                    url: { type: 'string', description: 'URL to request' },
                    method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'], description: 'HTTP method' },
                    headers: { type: 'object', description: 'Request headers' },
                    data: { type: 'object', description: 'Request body data' }
                },
                required: ['url']
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_environment_info',
            description: 'Get system and environment information',
            parameters: {
                type: 'object',
                properties: {}
            }
        }
    }
];

// Approval workflow
class ApprovalWorkflow {
    constructor(mode = 'suggest') {
        this.mode = mode; // 'suggest', 'auto-edit', 'full-auto'
    }
    
    async requestApproval(action, details) {
        if (this.mode === 'full-auto') {
            console.log(chalk.dim(`Auto-approved: ${action}`));
            return true;
        }
        
        if (this.mode === 'auto-edit' && action.includes('edit')) {
            console.log(chalk.dim(`Auto-approved edit: ${action}`));
            return true;
        }
        
        const { approved } = await inquirer.prompt([{
            type: 'confirm',
            name: 'approved',
            message: `Allow: ${action}?\n${chalk.dim(details)}`,
            default: true
        }]);
        
        return approved;
    }
}

// Tool executor
class ToolExecutor {
    constructor(approvalWorkflow) {
        this.approval = approvalWorkflow;
        this.shellManager = new ShellManager();
    }
    
    async execute(name, args) {
        try {
            switch (name) {
                case 'read_file':
                    return await this.readFile(args);
                    
                case 'write_file':
                    return await this.writeFile(args);
                    
                case 'edit_file':
                    return await this.editFile(args);
                    
                case 'list_directory':
                    return await this.listDirectory(args);
                    
                case 'create_directory':
                    return await this.createDirectory(args);
                    
                case 'delete_file':
                    return await this.deleteFile(args);
                    
                case 'run_command':
                    return await this.runCommand(args);

                case 'get_shell_cwd':
                    return await this.getShellCwd();

                case 'list_background_processes':
                    return await this.listBackgroundProcesses();

                case 'get_background_output':
                    return await this.getBackgroundOutput(args);

                case 'kill_background_process':
                    return await this.killBackgroundProcess(args);

                case 'http_request':
                    return await this.httpRequest(args);

                case 'get_environment_info':
                    return await this.getEnvironmentInfo();

                default:
                    return { error: `Unknown tool: ${name}` };
            }
        } catch (error) {
            return { error: error.message };
        }
    }
    
    async readFile(args) {
        const approved = await this.approval.requestApproval(
            'Read file',
            `Path: ${args.path}`
        );
        
        if (!approved) return { cancelled: true };
        
        const content = await fs.readFile(args.path, 'utf-8');
        return { content, lines: content.split('\n').length };
    }
    
    async writeFile(args) {
        const approved = await this.approval.requestApproval(
            'Write file',
            `Path: ${args.path}\nSize: ${args.content.length} chars`
        );
        
        if (!approved) return { cancelled: true };
        
        await fs.ensureFile(args.path);
        await fs.writeFile(args.path, args.content);
        return { success: true, path: args.path };
    }
    
    async editFile(args) {
        const approved = await this.approval.requestApproval(
            'Edit file',
            `Path: ${args.path}\nReplace: "${args.search.substring(0, 50)}..."`
        );
        
        if (!approved) return { cancelled: true };
        
        let content = await fs.readFile(args.path, 'utf-8');
        const occurrences = (content.match(new RegExp(args.search, 'g')) || []).length;
        content = content.replace(new RegExp(args.search, 'g'), args.replace);
        await fs.writeFile(args.path, content);
        
        return { success: true, replacements: occurrences };
    }
    
    async listDirectory(args) {
        const approved = await this.approval.requestApproval(
            'List directory',
            `Path: ${args.path}`
        );
        
        if (!approved) return { cancelled: true };
        
        const items = await fs.readdir(args.path);
        const details = await Promise.all(items.map(async item => {
            const fullPath = path.join(args.path, item);
            const stats = await fs.stat(fullPath);
            return {
                name: item,
                type: stats.isDirectory() ? 'directory' : 'file',
                size: stats.size
            };
        }));
        
        return { items: details };
    }
    
    async createDirectory(args) {
        const approved = await this.approval.requestApproval(
            'Create directory',
            `Path: ${args.path}`
        );
        
        if (!approved) return { cancelled: true };
        
        await fs.ensureDir(args.path);
        return { success: true, path: args.path };
    }
    
    async deleteFile(args) {
        const approved = await this.approval.requestApproval(
            'Delete file/directory',
            `Path: ${args.path}\n⚠️ This action cannot be undone!`
        );
        
        if (!approved) return { cancelled: true };
        
        await fs.remove(args.path);
        return { success: true, deleted: args.path };
    }
    
    async runCommand(args) {
        const cwd = args.cwd || this.shellManager.getCwd();

        const approved = await this.approval.requestApproval(
            'Run shell command',
            `Command: ${args.command}\nDirectory: ${cwd}\n${args.background ? 'Mode: Background' : ''}\n${args.streaming ? 'Mode: Streaming' : ''}`
        );

        if (!approved) return { cancelled: true };

        // Use enhanced shell manager for better session management
        if (args.streaming) {
            const output = { stdout: '', stderr: '' };

            await this.shellManager.executeStreaming(
                args.command,
                (data) => {
                    if (data.type === 'stdout') {
                        output.stdout += data.data;
                        console.log(data.data);
                    } else if (data.type === 'stderr') {
                        output.stderr += data.data;
                        console.error(chalk.yellow(data.data));
                    }
                },
                {
                    timeout: args.timeout,
                    cwd: args.cwd
                }
            );

            return output;
        } else {
            const result = await this.shellManager.execute(args.command, {
                timeout: args.timeout,
                background: args.background,
                cwd: args.cwd
            });

            return result;
        }
    }

    async getShellCwd() {
        const cwd = this.shellManager.getCwd();
        return { cwd };
    }

    async listBackgroundProcesses() {
        const session = this.shellManager.getSession();
        const processes = session.listBackgroundProcesses();
        return { processes };
    }

    async getBackgroundOutput(args) {
        const session = this.shellManager.getSession();
        const process = session.getBackgroundProcess(args.processId);

        if (!process) {
            return { error: 'Process not found' };
        }

        return {
            processId: args.processId,
            command: process.command,
            stdout: process.stdout.join(''),
            stderr: process.stderr.join(''),
            completed: process.completed,
            exitCode: process.exitCode
        };
    }

    async killBackgroundProcess(args) {
        const approved = await this.approval.requestApproval(
            'Kill background process',
            `Process ID: ${args.processId}`
        );

        if (!approved) return { cancelled: true };

        const session = this.shellManager.getSession();
        const killed = session.killBackgroundProcess(args.processId);

        return { success: killed };
    }
    
    async httpRequest(args) {
        const approved = await this.approval.requestApproval(
            'Make HTTP request',
            `${args.method || 'GET'} ${args.url}`
        );
        
        if (!approved) return { cancelled: true };
        
        const response = await axios({
            url: args.url,
            method: args.method || 'GET',
            headers: args.headers || {},
            data: args.data
        });
        
        return {
            status: response.status,
            data: response.data
        };
    }
    
    async getEnvironmentInfo() {
        return {
            platform: process.platform,
            nodeVersion: process.version,
            cwd: process.cwd(),
            env: {
                USER: process.env.USER || process.env.USERNAME,
                HOME: process.env.HOME || process.env.USERPROFILE
            }
        };
    }
}

/**
 * Parallel tool executor for concurrent tool execution
 * Inspired by Claude Code's ability to run multiple tools simultaneously
 */
class ParallelToolExecutor {
    constructor(toolExecutor) {
        this.executor = toolExecutor;
        this.maxConcurrent = 5; // Maximum parallel executions
    }

    /**
     * Execute multiple tools in parallel
     * @param {Array} toolCalls - Array of {name, args} objects
     * @returns {Promise<Array>} Results array matching input order
     */
    async executeParallel(toolCalls) {
        const results = new Array(toolCalls.length);
        const queue = toolCalls.map((call, index) => ({ ...call, index }));
        const executing = new Set();

        const executeNext = async () => {
            if (queue.length === 0) return;

            const call = queue.shift();
            const promise = this.executor.execute(call.name, call.args)
                .then(result => {
                    results[call.index] = { success: true, result, tool: call.name };
                })
                .catch(error => {
                    results[call.index] = { success: false, error: error.message, tool: call.name };
                })
                .finally(() => {
                    executing.delete(promise);
                    return executeNext();
                });

            executing.add(promise);

            if (executing.size < this.maxConcurrent && queue.length > 0) {
                await executeNext();
            }

            return promise;
        };

        // Start initial batch
        const initialPromises = [];
        for (let i = 0; i < Math.min(this.maxConcurrent, toolCalls.length); i++) {
            initialPromises.push(executeNext());
        }

        await Promise.all(initialPromises);
        await Promise.all(executing); // Wait for any remaining executions

        return results;
    }

    /**
     * Execute tools with dependency resolution
     * @param {Array} toolCalls - Array of {name, args, dependencies} objects
     * @returns {Promise<Array>} Results in execution order
     */
    async executeWithDependencies(toolCalls) {
        const results = new Map();
        const executed = new Set();

        const canExecute = (call) => {
            if (!call.dependencies || call.dependencies.length === 0) return true;
            return call.dependencies.every(dep => executed.has(dep));
        };

        const executeCall = async (call, index) => {
            const result = await this.executor.execute(call.name, call.args);
            results.set(index, result);
            executed.add(index);
            return result;
        };

        while (executed.size < toolCalls.length) {
            const batch = [];

            toolCalls.forEach((call, index) => {
                if (!executed.has(index) && canExecute(call)) {
                    batch.push(executeCall(call, index));
                }
            });

            if (batch.length === 0) {
                // Deadlock - circular dependencies or missing dependencies
                throw new Error('Cannot execute tools: circular or missing dependencies');
            }

            await Promise.all(batch);
        }

        // Return results in original order
        return toolCalls.map((_, index) => results.get(index));
    }

    /**
     * Execute tools sequentially (useful for chaining)
     * @param {Array} toolCalls - Array of {name, args} objects
     * @returns {Promise<Array>} Results array
     */
    async executeSequential(toolCalls) {
        const results = [];

        for (const call of toolCalls) {
            try {
                const result = await this.executor.execute(call.name, call.args);
                results.push({ success: true, result, tool: call.name });
            } catch (error) {
                results.push({ success: false, error: error.message, tool: call.name });
                break; // Stop on first error
            }
        }

        return results;
    }
}

/**
 * Tool chain builder for composing complex operations
 */
class ToolChain {
    constructor(executor) {
        this.executor = executor;
        this.steps = [];
    }

    /**
     * Add a tool to the chain
     */
    add(toolName, args, options = {}) {
        this.steps.push({
            name: toolName,
            args,
            dependencies: options.dependencies || [],
            condition: options.condition, // Function to determine if step should run
            onResult: options.onResult // Callback with result
        });
        return this;
    }

    /**
     * Execute the chain
     */
    async execute() {
        const results = new Map();

        for (const [index, step] of this.steps.entries()) {
            // Check condition
            if (step.condition && !step.condition(results)) {
                console.log(chalk.dim(`Skipping step ${index + 1}: ${step.name}`));
                continue;
            }

            // Execute tool
            console.log(chalk.cyan(`→ Step ${index + 1}: ${step.name}`));

            const result = await this.executor.execute(step.name, step.args);
            results.set(index, result);

            // Handle result callback
            if (step.onResult) {
                await step.onResult(result, results);
            }

            // Check for errors
            if (result.error) {
                console.log(chalk.red(`✗ Step ${index + 1} failed: ${result.error}`));
                throw new Error(`Chain failed at step ${index + 1}: ${result.error}`);
            }

            console.log(chalk.green(`✓ Step ${index + 1} completed`));
        }

        return Array.from(results.values());
    }

    /**
     * Clear the chain
     */
    clear() {
        this.steps = [];
        return this;
    }
}

module.exports = {
    TOOL_DEFINITIONS,
    ApprovalWorkflow,
    ToolExecutor,
    ParallelToolExecutor,
    ToolChain
};