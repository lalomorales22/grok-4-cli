// Enhanced shell execution system with persistent sessions
// Inspired by Claude Code's Bash tool capabilities

const { spawn, exec } = require('child_process');
const chalk = require('chalk');
const EventEmitter = require('events');
const path = require('path');

/**
 * Shell session manager for persistent shell interactions
 * Maintains working directory, environment, and command history
 */
class ShellSession extends EventEmitter {
    constructor(id, options = {}) {
        super();
        this.id = id;
        this.cwd = options.cwd || process.cwd();
        this.env = { ...process.env, ...options.env };
        this.history = [];
        this.backgroundProcesses = new Map();
        this.createdAt = Date.now();
    }

    /**
     * Execute a command in this shell session
     * @param {string} command - The command to execute
     * @param {Object} options - Execution options
     * @returns {Promise<{stdout, stderr, exitCode, duration}>}
     */
    async execute(command, options = {}) {
        const startTime = Date.now();
        const timeout = options.timeout || 120000; // 2 minutes default
        const runInBackground = options.background || false;

        // Handle cd command specially to maintain session state
        if (command.trim().startsWith('cd ')) {
            return this._handleCd(command);
        }

        const historyEntry = {
            command,
            timestamp: new Date().toISOString(),
            cwd: this.cwd
        };

        return new Promise((resolve, reject) => {
            const childProcess = exec(command, {
                cwd: this.cwd,
                env: this.env,
                timeout,
                maxBuffer: 10 * 1024 * 1024 // 10MB buffer
            }, (error, stdout, stderr) => {
                const duration = Date.now() - startTime;

                historyEntry.stdout = stdout;
                historyEntry.stderr = stderr;
                historyEntry.exitCode = error ? error.code : 0;
                historyEntry.duration = duration;

                this.history.push(historyEntry);

                if (runInBackground) {
                    // For background processes, don't wait for completion
                    resolve({
                        stdout: '',
                        stderr: '',
                        exitCode: null,
                        duration: 0,
                        background: true,
                        pid: childProcess.pid
                    });
                } else if (error && error.code !== 0) {
                    // Command failed
                    resolve({
                        stdout,
                        stderr: stderr || error.message,
                        exitCode: error.code || 1,
                        duration
                    });
                } else {
                    // Command succeeded
                    resolve({
                        stdout,
                        stderr,
                        exitCode: 0,
                        duration
                    });
                }
            });

            if (runInBackground) {
                const processId = `bg_${Date.now()}`;
                this.backgroundProcesses.set(processId, {
                    process: childProcess,
                    command,
                    startTime,
                    stdout: [],
                    stderr: []
                });

                // Collect output from background process
                childProcess.stdout.on('data', (data) => {
                    const bgProcess = this.backgroundProcesses.get(processId);
                    if (bgProcess) {
                        bgProcess.stdout.push(data.toString());
                    }
                });

                childProcess.stderr.on('data', (data) => {
                    const bgProcess = this.backgroundProcesses.get(processId);
                    if (bgProcess) {
                        bgProcess.stderr.push(data.toString());
                    }
                });

                childProcess.on('exit', (code) => {
                    const bgProcess = this.backgroundProcesses.get(processId);
                    if (bgProcess) {
                        bgProcess.exitCode = code;
                        bgProcess.completed = true;
                    }
                });

                this.emit('background-started', { processId, pid: childProcess.pid, command });
            }
        });
    }

    /**
     * Execute a command with streaming output
     * @param {string} command - The command to execute
     * @param {Function} onData - Callback for output data (stdout/stderr)
     * @param {Object} options - Execution options
     * @returns {Promise<{exitCode, duration}>}
     */
    async executeStreaming(command, onData, options = {}) {
        const startTime = Date.now();
        const timeout = options.timeout || 120000;

        // Handle cd command specially
        if (command.trim().startsWith('cd ')) {
            const result = await this._handleCd(command);
            onData({ type: 'stdout', data: result.stdout });
            return { exitCode: result.exitCode, duration: result.duration };
        }

        return new Promise((resolve, reject) => {
            const childProcess = spawn('sh', ['-c', command], {
                cwd: this.cwd,
                env: this.env,
                timeout
            });

            const historyEntry = {
                command,
                timestamp: new Date().toISOString(),
                cwd: this.cwd,
                streaming: true
            };

            let stdout = '';
            let stderr = '';

            childProcess.stdout.on('data', (data) => {
                const chunk = data.toString();
                stdout += chunk;
                onData({ type: 'stdout', data: chunk });
            });

            childProcess.stderr.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;
                onData({ type: 'stderr', data: chunk });
            });

            childProcess.on('exit', (code) => {
                const duration = Date.now() - startTime;

                historyEntry.stdout = stdout;
                historyEntry.stderr = stderr;
                historyEntry.exitCode = code;
                historyEntry.duration = duration;

                this.history.push(historyEntry);

                resolve({ exitCode: code, duration });
            });

            childProcess.on('error', (error) => {
                onData({ type: 'error', data: error.message });
                reject(error);
            });

            // Handle timeout
            if (timeout) {
                setTimeout(() => {
                    childProcess.kill('SIGTERM');
                    onData({ type: 'error', data: `Command timed out after ${timeout}ms` });
                }, timeout);
            }
        });
    }

    /**
     * Handle cd command to maintain session working directory
     */
    async _handleCd(command) {
        const match = command.match(/cd\s+(.+)/);
        if (!match) {
            return { stdout: '', stderr: 'Invalid cd command', exitCode: 1, duration: 0 };
        }

        let targetDir = match[1].trim();

        // Remove quotes if present
        targetDir = targetDir.replace(/^["']|["']$/g, '');

        // Expand ~ to home directory
        if (targetDir.startsWith('~')) {
            targetDir = targetDir.replace('~', process.env.HOME || process.env.USERPROFILE);
        }

        // Resolve relative paths
        const newCwd = path.isAbsolute(targetDir)
            ? targetDir
            : path.resolve(this.cwd, targetDir);

        try {
            // Check if directory exists
            const fs = require('fs-extra');
            const stats = await fs.stat(newCwd);

            if (!stats.isDirectory()) {
                return {
                    stdout: '',
                    stderr: `cd: not a directory: ${targetDir}`,
                    exitCode: 1,
                    duration: 0
                };
            }

            // Update session working directory
            this.cwd = newCwd;

            return {
                stdout: newCwd,
                stderr: '',
                exitCode: 0,
                duration: 0
            };
        } catch (error) {
            return {
                stdout: '',
                stderr: `cd: no such file or directory: ${targetDir}`,
                exitCode: 1,
                duration: 0
            };
        }
    }

    /**
     * Get the current working directory
     */
    getCwd() {
        return this.cwd;
    }

    /**
     * Get background process status
     */
    getBackgroundProcess(processId) {
        return this.backgroundProcesses.get(processId);
    }

    /**
     * List all background processes
     */
    listBackgroundProcesses() {
        const processes = [];
        for (const [id, proc] of this.backgroundProcesses.entries()) {
            processes.push({
                id,
                command: proc.command,
                pid: proc.process.pid,
                startTime: proc.startTime,
                completed: proc.completed || false,
                exitCode: proc.exitCode
            });
        }
        return processes;
    }

    /**
     * Kill a background process
     */
    killBackgroundProcess(processId) {
        const bgProcess = this.backgroundProcesses.get(processId);
        if (bgProcess && bgProcess.process) {
            bgProcess.process.kill('SIGTERM');
            this.backgroundProcesses.delete(processId);
            return true;
        }
        return false;
    }

    /**
     * Get command history
     */
    getHistory() {
        return this.history;
    }

    /**
     * Clear command history
     */
    clearHistory() {
        this.history = [];
    }
}

/**
 * Manages multiple shell sessions
 */
class ShellManager {
    constructor() {
        this.sessions = new Map();
        this.defaultSessionId = 'default';
        this._createSession(this.defaultSessionId);
    }

    /**
     * Create a new shell session
     */
    _createSession(id, options = {}) {
        const session = new ShellSession(id, options);
        this.sessions.set(id, session);
        return session;
    }

    /**
     * Get or create a shell session
     */
    getSession(id = null) {
        const sessionId = id || this.defaultSessionId;

        if (!this.sessions.has(sessionId)) {
            return this._createSession(sessionId);
        }

        return this.sessions.get(sessionId);
    }

    /**
     * Execute command in a session
     */
    async execute(command, options = {}) {
        const session = this.getSession(options.sessionId);
        return await session.execute(command, options);
    }

    /**
     * Execute command with streaming output
     */
    async executeStreaming(command, onData, options = {}) {
        const session = this.getSession(options.sessionId);
        return await session.executeStreaming(command, onData, options);
    }

    /**
     * Get current working directory for a session
     */
    getCwd(sessionId = null) {
        const session = this.getSession(sessionId);
        return session.getCwd();
    }

    /**
     * List all sessions
     */
    listSessions() {
        const sessions = [];
        for (const [id, session] of this.sessions.entries()) {
            sessions.push({
                id,
                cwd: session.cwd,
                commandCount: session.history.length,
                backgroundProcesses: session.backgroundProcesses.size,
                createdAt: session.createdAt
            });
        }
        return sessions;
    }

    /**
     * Delete a session
     */
    deleteSession(id) {
        if (id === this.defaultSessionId) {
            throw new Error('Cannot delete default session');
        }

        const session = this.sessions.get(id);
        if (session) {
            // Kill all background processes
            for (const processId of session.backgroundProcesses.keys()) {
                session.killBackgroundProcess(processId);
            }
            this.sessions.delete(id);
            return true;
        }
        return false;
    }

    /**
     * Format command output for display
     */
    static formatOutput(result) {
        const parts = [];

        if (result.stdout) {
            parts.push(result.stdout);
        }

        if (result.stderr) {
            parts.push(chalk.yellow(result.stderr));
        }

        if (result.exitCode !== 0 && result.exitCode !== null) {
            parts.push(chalk.red(`Exit code: ${result.exitCode}`));
        }

        if (result.duration !== undefined) {
            parts.push(chalk.dim(`(${result.duration}ms)`));
        }

        if (result.background) {
            parts.push(chalk.blue(`Running in background (PID: ${result.pid})`));
        }

        return parts.join('\n');
    }
}

module.exports = {
    ShellManager,
    ShellSession
};
