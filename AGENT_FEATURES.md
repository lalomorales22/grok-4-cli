# Agentic Features for Grok CLI

Inspired by Claude Code, this implementation adds advanced agentic capabilities including persistent shell sessions, background process management, task planning, and parallel tool execution.

## 🚀 Key Features

### 1. **Enhanced Shell Command Execution**

Persistent shell sessions that maintain working directory state across commands.

#### Features:
- **Session Persistence**: Working directory (`cd`) persists across commands
- **Background Execution**: Run long-running commands asynchronously
- **Streaming Output**: Real-time command output display
- **Timeout Control**: Configurable command timeouts
- **Command History**: Track all executed commands with results

#### Available Tools:
- `run_command` - Execute shell commands with enhanced capabilities
- `get_shell_cwd` - Get current working directory
- `list_background_processes` - List all background processes
- `get_background_output` - Get output from a background process
- `kill_background_process` - Terminate a background process

#### Slash Commands:
```bash
/shell <cmd>  # Execute shell command
/sh <cmd>     # Alias for /shell
/cwd          # Show current working directory
/pwd          # Alias for /cwd
/bg           # List background processes
/background   # Alias for /bg
```

#### Examples:

```javascript
// Basic command execution
await shellManager.execute('ls -la');

// Change directory (persists across calls)
await shellManager.execute('cd /home/user/projects');
await shellManager.execute('pwd');  // Shows /home/user/projects

// Background execution
await shellManager.execute('npm run build', { background: true });

// Streaming output
await shellManager.executeStreaming('npm test', (data) => {
    console.log(data.data);
}, { timeout: 300000 });
```

### 2. **Agent Task Management**

Intelligent task planning, tracking, and execution system.

#### Features:
- **Task Planning**: Break down complex operations into steps
- **Status Tracking**: Monitor tasks (pending, in_progress, completed, failed, blocked)
- **Dependency Management**: Define task dependencies
- **Progress Visualization**: Display progress with tables and status symbols
- **Task Duration Tracking**: Monitor execution time

#### Task States:
- 🔵 **pending** - Task not yet started
- 🔷 **in_progress** - Currently executing
- 🟢 **completed** - Successfully finished
- 🔴 **failed** - Execution failed
- 🟡 **blocked** - Waiting for dependencies

#### Slash Commands:
```bash
/tasks  # View current task list with progress
```

#### Example Usage:

```javascript
const { TaskManager } = require('./lib/agent');

const taskManager = new TaskManager();

// Add tasks
taskManager.addTask('Install dependencies');
taskManager.addTask('Run tests');
taskManager.addTask('Build project');

// Execute with status updates
taskManager.startTask('task_1');
// ... do work ...
taskManager.completeTask('task_1', { result: 'Success' });

// Display progress
taskManager.display();
```

### 3. **Parallel Tool Execution**

Execute multiple tools concurrently for improved performance.

#### Features:
- **Concurrent Execution**: Run up to 5 tools simultaneously
- **Dependency Resolution**: Automatically handle task dependencies
- **Error Handling**: Graceful failure handling for parallel operations
- **Execution Modes**: Parallel, sequential, or dependency-based

#### Example Usage:

```javascript
const { ParallelToolExecutor } = require('./lib/tools');

const parallelExecutor = new ParallelToolExecutor(toolExecutor);

// Execute multiple tools in parallel
const results = await parallelExecutor.executeParallel([
    { name: 'read_file', args: { path: 'package.json' } },
    { name: 'read_file', args: { path: 'README.md' } },
    { name: 'list_directory', args: { path: '.' } }
]);

// Execute with dependencies
const results = await parallelExecutor.executeWithDependencies([
    { name: 'create_directory', args: { path: './build' }, dependencies: [] },
    { name: 'write_file', args: { path: './build/output.txt', content: 'Hello' }, dependencies: [0] }
]);
```

### 4. **Tool Chaining**

Build complex multi-step operations with conditional execution.

#### Features:
- **Step-by-Step Execution**: Chain multiple tools together
- **Conditional Logic**: Skip steps based on conditions
- **Result Callbacks**: Process intermediate results
- **Error Propagation**: Stop chain on first error

#### Example Usage:

```javascript
const { ToolChain } = require('./lib/tools');

const chain = new ToolChain(toolExecutor);

chain
    .add('create_directory', { path: './dist' })
    .add('write_file', {
        path: './dist/index.js',
        content: 'console.log("Hello");'
    })
    .add('run_command', {
        command: 'node ./dist/index.js'
    }, {
        onResult: (result) => {
            console.log('Output:', result.stdout);
        }
    });

await chain.execute();
```

## 📋 Architecture Overview

### Components

1. **ShellManager** (`lib/shell.js`)
   - Manages persistent shell sessions
   - Handles background processes
   - Maintains working directory state
   - Provides streaming output

2. **TaskManager** (`lib/agent.js`)
   - Plans and tracks tasks
   - Manages task dependencies
   - Visualizes progress
   - Exports/imports task state

3. **ParallelToolExecutor** (`lib/tools.js`)
   - Executes tools concurrently
   - Resolves dependencies
   - Handles errors gracefully

4. **ToolChain** (`lib/tools.js`)
   - Builds complex workflows
   - Supports conditional execution
   - Provides result callbacks

### Integration with Grok

The agentic features are integrated into the Grok CLI through:

1. **Enhanced Tool Definitions**: New tools for shell and process management
2. **Slash Commands**: Direct access to shell and task features
3. **Function Calling**: Tools available to the LLM for autonomous execution

## 🎯 Use Cases

### 1. Complex Development Workflows

```bash
> Help me set up a new React project and run tests

Grok will:
1. Create project directory
2. Initialize npm
3. Install dependencies
4. Create project structure
5. Run tests in background
6. Monitor test output
```

### 2. Multi-Step Operations

```bash
> Clone the repo, install deps, and start the dev server

Grok can:
1. Execute git clone
2. Change to project directory (cd persists)
3. Run npm install
4. Start dev server in background
5. Monitor server logs
```

### 3. System Administration

```bash
> Check disk usage, clean logs older than 30 days, and restart services

Grok can:
1. Execute df -h in parallel with du commands
2. Find and remove old logs
3. Restart services with systemctl
4. Monitor restart status
```

## 🔧 Configuration

### Shell Session Options

```javascript
const shellManager = new ShellManager();

// Execute with custom options
await shellManager.execute('command', {
    timeout: 60000,        // 1 minute timeout
    background: true,      // Run in background
    cwd: '/custom/path'    // Override working directory
});
```

### Task Manager Options

```javascript
const taskManager = new TaskManager();

// Add task with dependencies
taskManager.addTask('Build project', {
    dependencies: ['task_1', 'task_2'],
    metadata: { priority: 'high' }
});
```

### Parallel Execution Options

```javascript
const parallelExecutor = new ParallelToolExecutor(toolExecutor);
parallelExecutor.maxConcurrent = 3; // Limit to 3 concurrent executions
```

## 🧪 Testing

### Test Shell Commands

```bash
# In Grok interactive mode:
/shell ls -la
/shell cd /tmp
/cwd  # Should show /tmp
/shell pwd  # Should show /tmp
```

### Test Background Processes

```bash
/shell sleep 30 &
/bg  # Should show the background process
```

### Test Task Management

```bash
/tasks  # View current tasks
```

## 🚨 Security Considerations

1. **Command Approval**: All commands require approval (except in auto modes)
2. **Sandboxing**: Commands run in the user's context (no privilege escalation)
3. **Timeout Protection**: All commands have configurable timeouts
4. **Error Handling**: Graceful failure handling prevents cascading errors

## 📚 API Reference

### ShellManager

```javascript
class ShellManager {
    execute(command, options)          // Execute command
    executeStreaming(command, onData, options)  // Stream output
    getCwd(sessionId)                  // Get working directory
    listSessions()                     // List all sessions
}
```

### TaskManager

```javascript
class TaskManager {
    addTask(description, options)      // Add new task
    startTask(id)                      // Start task
    completeTask(id, result)           // Complete task
    display()                          // Display task list
    toJSON()                           // Export tasks
}
```

### ParallelToolExecutor

```javascript
class ParallelToolExecutor {
    executeParallel(toolCalls)         // Execute in parallel
    executeWithDependencies(toolCalls) // Resolve dependencies
    executeSequential(toolCalls)       // Sequential execution
}
```

## 🎉 Benefits

1. **Efficiency**: Parallel execution reduces overall execution time
2. **Visibility**: Task tracking provides clear progress indication
3. **Reliability**: Persistent sessions and error handling improve robustness
4. **Flexibility**: Multiple execution modes support various use cases
5. **Autonomy**: LLM can plan and execute complex multi-step operations

## 🔮 Future Enhancements

- [ ] MCP (Model Context Protocol) integration
- [ ] Advanced task scheduling and prioritization
- [ ] Distributed execution across multiple sessions
- [ ] Enhanced security with sandboxing
- [ ] Web-based task monitoring dashboard
- [ ] Integration with CI/CD pipelines
- [ ] Task templates and presets
- [ ] Rollback capabilities for failed operations

---

**Inspired by Claude Code** - These features bring autonomous agentic capabilities to Grok CLI, enabling it to handle complex, multi-step operations with intelligence and efficiency.
