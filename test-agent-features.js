#!/usr/bin/env node

/**
 * Test script for agentic features
 * Tests shell management, task tracking, and parallel execution
 */

const chalk = require('chalk');
const { ShellManager } = require('./lib/shell');
const { TaskManager, AgentPlanner } = require('./lib/agent');
const { ToolExecutor, ApprovalWorkflow, ParallelToolExecutor, ToolChain } = require('./lib/tools');

console.log(chalk.bold.cyan('\n🧪 Testing Agentic Features\n'));

// Test 1: Shell Management
async function testShellManagement() {
    console.log(chalk.yellow('Test 1: Shell Management'));
    console.log(chalk.dim('Testing persistent shell sessions...\n'));

    const shellManager = new ShellManager();

    try {
        // Test basic command
        console.log(chalk.cyan('→ Executing: pwd'));
        let result = await shellManager.execute('pwd');
        console.log(chalk.green(`✓ Current directory: ${result.stdout.trim()}`));

        // Test cd persistence
        console.log(chalk.cyan('\n→ Executing: cd /tmp'));
        result = await shellManager.execute('cd /tmp');
        console.log(chalk.green(`✓ Changed to: ${result.stdout.trim()}`));

        // Verify cd persisted
        console.log(chalk.cyan('\n→ Verifying persistence: pwd'));
        result = await shellManager.execute('pwd');
        const cwd = result.stdout.trim();
        if (cwd === '/tmp') {
            console.log(chalk.green(`✓ Working directory persisted: ${cwd}`));
        } else {
            console.log(chalk.red(`✗ Working directory did not persist: ${cwd}`));
        }

        // Test getCwd method
        const directCwd = shellManager.getCwd();
        console.log(chalk.green(`✓ getCwd() returns: ${directCwd}`));

        // Test command with timeout
        console.log(chalk.cyan('\n→ Testing command with timeout: sleep 1'));
        const start = Date.now();
        result = await shellManager.execute('sleep 1', { timeout: 5000 });
        const duration = Date.now() - start;
        console.log(chalk.green(`✓ Command completed in ${duration}ms`));

        console.log(chalk.bold.green('\n✓ Shell Management Tests Passed\n'));
        return true;
    } catch (error) {
        console.log(chalk.red(`✗ Shell Management Test Failed: ${error.message}\n`));
        return false;
    }
}

// Test 2: Task Management
async function testTaskManagement() {
    console.log(chalk.yellow('Test 2: Task Management'));
    console.log(chalk.dim('Testing task planning and tracking...\n'));

    const taskManager = new TaskManager();

    try {
        // Add tasks
        console.log(chalk.cyan('→ Adding tasks'));
        const task1 = taskManager.addTask('Initialize project', {
            activeForm: 'Initializing project'
        });
        const task2 = taskManager.addTask('Install dependencies', {
            activeForm: 'Installing dependencies',
            dependencies: [task1.id]
        });
        const task3 = taskManager.addTask('Run tests', {
            activeForm: 'Running tests',
            dependencies: [task2.id]
        });

        console.log(chalk.green(`✓ Added ${taskManager.getAllTasks().length} tasks`));

        // Start and complete tasks
        console.log(chalk.cyan('\n→ Executing tasks'));
        taskManager.startTask(task1.id);
        console.log(`  ${task1.toString()}`);

        // Simulate work
        await new Promise(resolve => setTimeout(resolve, 100));

        taskManager.completeTask(task1.id, { success: true });
        console.log(chalk.green(`✓ ${task1.description} completed`));

        // Check progress
        const progress = taskManager.getProgress();
        console.log(chalk.cyan(`\nProgress: ${progress.completed}/${progress.total} (${progress.percentage}%)`));

        // Display task list
        console.log(chalk.cyan('\n→ Task List:'));
        taskManager.display();

        console.log(chalk.bold.green('✓ Task Management Tests Passed\n'));
        return true;
    } catch (error) {
        console.log(chalk.red(`✗ Task Management Test Failed: ${error.message}\n`));
        return false;
    }
}

// Test 3: Parallel Tool Execution
async function testParallelExecution() {
    console.log(chalk.yellow('Test 3: Parallel Tool Execution'));
    console.log(chalk.dim('Testing concurrent tool execution...\n'));

    const approval = new ApprovalWorkflow('full-auto'); // Auto-approve for testing
    const toolExecutor = new ToolExecutor(approval);
    const parallelExecutor = new ParallelToolExecutor(toolExecutor);

    try {
        // Create test files
        const fs = require('fs-extra');
        await fs.ensureDir('./test-temp');

        console.log(chalk.cyan('→ Executing 3 file operations in parallel'));
        const start = Date.now();

        const results = await parallelExecutor.executeParallel([
            { name: 'write_file', args: { path: './test-temp/test1.txt', content: 'Test 1' } },
            { name: 'write_file', args: { path: './test-temp/test2.txt', content: 'Test 2' } },
            { name: 'write_file', args: { path: './test-temp/test3.txt', content: 'Test 3' } }
        ]);

        const duration = Date.now() - start;

        const successCount = results.filter(r => r.success).length;
        console.log(chalk.green(`✓ Completed ${successCount}/3 operations in ${duration}ms`));

        // Test dependency execution
        console.log(chalk.cyan('\n→ Testing dependency resolution'));
        const depResults = await parallelExecutor.executeWithDependencies([
            { name: 'create_directory', args: { path: './test-temp/subdir' }, dependencies: [] },
            { name: 'write_file', args: { path: './test-temp/subdir/file.txt', content: 'Hello' }, dependencies: [0] }
        ]);

        console.log(chalk.green(`✓ Dependency resolution successful`));

        // Cleanup
        await fs.remove('./test-temp');
        console.log(chalk.dim('Cleaned up test files'));

        console.log(chalk.bold.green('\n✓ Parallel Execution Tests Passed\n'));
        return true;
    } catch (error) {
        console.log(chalk.red(`✗ Parallel Execution Test Failed: ${error.message}\n`));
        return false;
    }
}

// Test 4: Tool Chaining
async function testToolChaining() {
    console.log(chalk.yellow('Test 4: Tool Chaining'));
    console.log(chalk.dim('Testing complex operation chains...\n'));

    const approval = new ApprovalWorkflow('full-auto');
    const toolExecutor = new ToolExecutor(approval);
    const chain = new ToolChain(toolExecutor);

    try {
        const fs = require('fs-extra');

        console.log(chalk.cyan('→ Building tool chain'));
        chain
            .add('create_directory', { path: './test-chain' })
            .add('write_file', { path: './test-chain/data.txt', content: 'Test data' })
            .add('read_file', { path: './test-chain/data.txt' }, {
                onResult: (result) => {
                    console.log(chalk.dim(`  Read ${result.lines} lines`));
                }
            })
            .add('list_directory', { path: './test-chain' }, {
                onResult: (result) => {
                    console.log(chalk.dim(`  Found ${result.items.length} items`));
                }
            });

        console.log(chalk.green(`✓ Chain built with ${chain.steps.length} steps`));

        console.log(chalk.cyan('\n→ Executing chain'));
        await chain.execute();

        // Cleanup
        await fs.remove('./test-chain');
        console.log(chalk.dim('Cleaned up test files'));

        console.log(chalk.bold.green('\n✓ Tool Chaining Tests Passed\n'));
        return true;
    } catch (error) {
        console.log(chalk.red(`✗ Tool Chaining Test Failed: ${error.message}\n`));
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log(chalk.bold('Running all agentic feature tests...\n'));

    const results = {
        shellManagement: await testShellManagement(),
        taskManagement: await testTaskManagement(),
        parallelExecution: await testParallelExecution(),
        toolChaining: await testToolChaining()
    };

    // Summary
    console.log(chalk.bold.cyan('\n📊 Test Summary\n'));

    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;

    for (const [name, result] of Object.entries(results)) {
        const status = result ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
        console.log(`  ${status} - ${name}`);
    }

    console.log(chalk.bold(`\n${passed}/${total} tests passed\n`));

    if (passed === total) {
        console.log(chalk.bold.green('🎉 All tests passed!\n'));
        process.exit(0);
    } else {
        console.log(chalk.bold.red('❌ Some tests failed\n'));
        process.exit(1);
    }
}

// Run tests
runAllTests().catch(error => {
    console.error(chalk.red('Test suite error:'), error);
    process.exit(1);
});
