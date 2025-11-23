// Agent task management and planning system
// Inspired by Claude Code's TodoWrite and agentic capabilities

const chalk = require('chalk');
const Table = require('cli-table3');
const EventEmitter = require('events');

/**
 * Task status enumeration
 */
const TaskStatus = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    FAILED: 'failed',
    BLOCKED: 'blocked'
};

/**
 * Individual task representation
 */
class Task {
    constructor(id, description, options = {}) {
        this.id = id;
        this.description = description;
        this.activeForm = options.activeForm || `${description}...`;
        this.status = options.status || TaskStatus.PENDING;
        this.dependencies = options.dependencies || [];
        this.result = null;
        this.error = null;
        this.startTime = null;
        this.endTime = null;
        this.metadata = options.metadata || {};
    }

    /**
     * Start the task
     */
    start() {
        this.status = TaskStatus.IN_PROGRESS;
        this.startTime = Date.now();
    }

    /**
     * Complete the task successfully
     */
    complete(result = null) {
        this.status = TaskStatus.COMPLETED;
        this.result = result;
        this.endTime = Date.now();
    }

    /**
     * Mark task as failed
     */
    fail(error) {
        this.status = TaskStatus.FAILED;
        this.error = error;
        this.endTime = Date.now();
    }

    /**
     * Block the task
     */
    block(reason) {
        this.status = TaskStatus.BLOCKED;
        this.error = reason;
    }

    /**
     * Get task duration in milliseconds
     */
    getDuration() {
        if (!this.startTime) return 0;
        const end = this.endTime || Date.now();
        return end - this.startTime;
    }

    /**
     * Check if task can be executed (dependencies met)
     */
    canExecute(taskManager) {
        if (this.status !== TaskStatus.PENDING) return false;

        for (const depId of this.dependencies) {
            const depTask = taskManager.getTask(depId);
            if (!depTask || depTask.status !== TaskStatus.COMPLETED) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get display string for task
     */
    toString() {
        const statusSymbol = this.getStatusSymbol();
        const duration = this.getDuration();
        const durationStr = duration > 0 ? chalk.dim(` (${duration}ms)`) : '';

        if (this.status === TaskStatus.IN_PROGRESS) {
            return `${statusSymbol} ${chalk.cyan(this.activeForm)}${durationStr}`;
        }

        return `${statusSymbol} ${this.description}${durationStr}`;
    }

    /**
     * Get status symbol for display
     */
    getStatusSymbol() {
        switch (this.status) {
            case TaskStatus.PENDING:
                return chalk.gray('○');
            case TaskStatus.IN_PROGRESS:
                return chalk.blue('◐');
            case TaskStatus.COMPLETED:
                return chalk.green('●');
            case TaskStatus.FAILED:
                return chalk.red('✗');
            case TaskStatus.BLOCKED:
                return chalk.yellow('⚠');
            default:
                return '?';
        }
    }
}

/**
 * Manages task planning, tracking, and execution
 */
class TaskManager extends EventEmitter {
    constructor() {
        super();
        this.tasks = new Map();
        this.taskOrder = [];
        this.nextId = 1;
    }

    /**
     * Add a new task
     */
    addTask(description, options = {}) {
        const id = options.id || `task_${this.nextId++}`;
        const task = new Task(id, description, options);
        this.tasks.set(id, task);
        this.taskOrder.push(id);

        this.emit('task-added', task);
        return task;
    }

    /**
     * Add multiple tasks at once
     */
    addTasks(taskDescriptions) {
        const tasks = [];
        for (const desc of taskDescriptions) {
            if (typeof desc === 'string') {
                tasks.push(this.addTask(desc));
            } else {
                tasks.push(this.addTask(desc.description, desc.options));
            }
        }
        return tasks;
    }

    /**
     * Get a task by ID
     */
    getTask(id) {
        return this.tasks.get(id);
    }

    /**
     * Update task status
     */
    updateTaskStatus(id, status, data = {}) {
        const task = this.tasks.get(id);
        if (!task) return false;

        const oldStatus = task.status;

        switch (status) {
            case TaskStatus.IN_PROGRESS:
                task.start();
                break;
            case TaskStatus.COMPLETED:
                task.complete(data.result);
                break;
            case TaskStatus.FAILED:
                task.fail(data.error);
                break;
            case TaskStatus.BLOCKED:
                task.block(data.reason);
                break;
            default:
                task.status = status;
        }

        this.emit('task-updated', { task, oldStatus, newStatus: status });
        return true;
    }

    /**
     * Start a task
     */
    startTask(id) {
        return this.updateTaskStatus(id, TaskStatus.IN_PROGRESS);
    }

    /**
     * Complete a task
     */
    completeTask(id, result = null) {
        return this.updateTaskStatus(id, TaskStatus.COMPLETED, { result });
    }

    /**
     * Fail a task
     */
    failTask(id, error) {
        return this.updateTaskStatus(id, TaskStatus.FAILED, { error });
    }

    /**
     * Get all tasks in order
     */
    getAllTasks() {
        return this.taskOrder.map(id => this.tasks.get(id));
    }

    /**
     * Get tasks by status
     */
    getTasksByStatus(status) {
        return this.getAllTasks().filter(task => task.status === status);
    }

    /**
     * Get next executable task (respecting dependencies)
     */
    getNextExecutableTask() {
        for (const id of this.taskOrder) {
            const task = this.tasks.get(id);
            if (task.canExecute(this)) {
                return task;
            }
        }
        return null;
    }

    /**
     * Get progress statistics
     */
    getProgress() {
        const all = this.getAllTasks();
        const completed = all.filter(t => t.status === TaskStatus.COMPLETED).length;
        const inProgress = all.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
        const failed = all.filter(t => t.status === TaskStatus.FAILED).length;
        const blocked = all.filter(t => t.status === TaskStatus.BLOCKED).length;
        const pending = all.filter(t => t.status === TaskStatus.PENDING).length;

        return {
            total: all.length,
            completed,
            inProgress,
            failed,
            blocked,
            pending,
            percentage: all.length > 0 ? Math.round((completed / all.length) * 100) : 0
        };
    }

    /**
     * Display task list in terminal
     */
    display() {
        const tasks = this.getAllTasks();

        if (tasks.length === 0) {
            console.log(chalk.dim('No tasks'));
            return;
        }

        console.log(chalk.bold('\n📋 Task List\n'));

        for (const task of tasks) {
            console.log(`  ${task.toString()}`);
            if (task.error) {
                console.log(`    ${chalk.red('Error:')} ${task.error}`);
            }
            if (task.dependencies.length > 0) {
                console.log(`    ${chalk.dim('Depends on:')} ${task.dependencies.join(', ')}`);
            }
        }

        const progress = this.getProgress();
        console.log(chalk.dim(`\n  Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)\n`));
    }

    /**
     * Display task list as a table
     */
    displayTable() {
        const tasks = this.getAllTasks();

        if (tasks.length === 0) {
            console.log(chalk.dim('No tasks'));
            return;
        }

        const table = new Table({
            head: ['#', 'Status', 'Task', 'Duration'],
            style: {
                head: ['cyan']
            }
        });

        tasks.forEach((task, index) => {
            const duration = task.getDuration();
            const durationStr = duration > 0 ? `${duration}ms` : '-';

            table.push([
                index + 1,
                task.getStatusSymbol(),
                task.status === TaskStatus.IN_PROGRESS ? task.activeForm : task.description,
                durationStr
            ]);
        });

        console.log('\n' + table.toString() + '\n');

        const progress = this.getProgress();
        console.log(chalk.dim(`Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)\n`));
    }

    /**
     * Clear all tasks
     */
    clear() {
        this.tasks.clear();
        this.taskOrder = [];
        this.emit('tasks-cleared');
    }

    /**
     * Export tasks to JSON
     */
    toJSON() {
        return {
            tasks: this.getAllTasks().map(task => ({
                id: task.id,
                description: task.description,
                activeForm: task.activeForm,
                status: task.status,
                dependencies: task.dependencies,
                result: task.result,
                error: task.error,
                duration: task.getDuration(),
                metadata: task.metadata
            })),
            progress: this.getProgress()
        };
    }

    /**
     * Import tasks from JSON
     */
    fromJSON(data) {
        this.clear();

        for (const taskData of data.tasks) {
            const task = this.addTask(taskData.description, {
                id: taskData.id,
                activeForm: taskData.activeForm,
                status: taskData.status,
                dependencies: taskData.dependencies,
                metadata: taskData.metadata
            });

            if (taskData.result) task.result = taskData.result;
            if (taskData.error) task.error = taskData.error;
        }

        return this;
    }
}

/**
 * Agent planner for breaking down complex tasks
 */
class AgentPlanner {
    constructor(taskManager) {
        this.taskManager = taskManager || new TaskManager();
    }

    /**
     * Create a plan from a user request
     */
    async createPlan(request, options = {}) {
        // This is a simplified planner - in a real implementation,
        // you might use the LLM to help break down tasks
        const tasks = [];

        if (options.tasks) {
            // User provided explicit tasks
            for (const task of options.tasks) {
                this.taskManager.addTask(task.description, task.options);
            }
        }

        return this.taskManager;
    }

    /**
     * Execute tasks sequentially
     */
    async executeSequentially(executor) {
        const tasks = this.taskManager.getAllTasks();

        for (const task of tasks) {
            if (task.status === TaskStatus.COMPLETED) continue;

            this.taskManager.startTask(task.id);

            try {
                const result = await executor(task);
                this.taskManager.completeTask(task.id, result);
            } catch (error) {
                this.taskManager.failTask(task.id, error.message);
                throw error; // Stop on first error
            }
        }

        return this.taskManager.getProgress();
    }

    /**
     * Execute tasks in parallel (respecting dependencies)
     */
    async executeParallel(executor, options = {}) {
        const maxConcurrent = options.maxConcurrent || 3;
        const running = new Set();
        const completed = new Set();

        const executeNext = async () => {
            // Find next executable task
            const tasks = this.taskManager.getAllTasks();

            for (const task of tasks) {
                if (running.has(task.id) || completed.has(task.id)) continue;
                if (!task.canExecute(this.taskManager)) continue;

                running.add(task.id);
                this.taskManager.startTask(task.id);

                try {
                    const result = await executor(task);
                    this.taskManager.completeTask(task.id, result);
                    completed.add(task.id);
                } catch (error) {
                    this.taskManager.failTask(task.id, error.message);
                    completed.add(task.id);
                } finally {
                    running.delete(task.id);
                }

                // Try to execute more tasks
                if (running.size < maxConcurrent) {
                    await executeNext();
                }

                break;
            }
        };

        // Start initial batch
        const initialPromises = [];
        for (let i = 0; i < maxConcurrent; i++) {
            initialPromises.push(executeNext());
        }

        await Promise.all(initialPromises);

        return this.taskManager.getProgress();
    }
}

module.exports = {
    TaskManager,
    Task,
    TaskStatus,
    AgentPlanner
};
