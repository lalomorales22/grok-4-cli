# 🤖 Grok-4 CLI
<img width="875" height="487" alt="Screenshot 2025-08-15 at 10 57 03 PM" src="https://github.com/user-attachments/assets/f342b139-72ce-4e63-93f2-a0a19225f2d4" />

A professional, feature-rich command-line interface for xAI's Grok API with advanced capabilities similar to Claude Code and Gemini CLI.

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/yourusername/grok-4-cli)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![API](https://img.shields.io/badge/xAI%20API-v1-purple.svg)](https://x.ai/api)
[![CodeQL](https://github.com/yourusername/grok-4-cli/actions/workflows/codeql.yml/badge.svg)](https://github.com/yourusername/grok-4-cli/actions/workflows/codeql.yml)

## ✨ Features

### 🎨 Enhanced UI Experience
- **Animated Welcome Screen** with black & white gradient ASCII art
- **Rich Terminal Formatting** with syntax highlighting and markdown rendering
- **Progress Indicators** for streaming responses and long operations
- **Gradient Themes** for a visually appealing interface (16 themes available)
- **Interactive Tables** for displaying data and options
- **Animated Loading Effects** including matrix rain, glitch text, and pulse effects
- **Clean Response Formatting** with proper spacing after token usage

### 💬 Advanced Chat Capabilities
- **Interactive Mode** with persistent conversation history
- **Slash Commands** for quick actions (`/help`, `/model`, `/search`, etc.)
- **GROK.md Support** for project-specific context
- **Multi-Model Support** (Grok-4, Grok-3, Grok-3-mini, Grok-2-image)
- **Streaming Responses** with real-time progress tracking
- **Session Management** - Save, load, and resume conversations

### 🚀 Unique Grok Features
- **Live Search Integration** - Search web, news, and X platform in real-time
- **Image Generation** - Create and auto-save images locally to `./grok-images/`
- **Vision Analysis** - Analyze images with Grok-4's vision capabilities
- **Function Calling** - Execute tools for file operations (auto-creates files)
- **Token Usage Tracking** - Monitor API usage and costs in real-time
- **Automatic Rate Limit Handling** with exponential backoff

### 🤖 Agentic Capabilities (NEW!)
Inspired by Claude Code, Grok CLI now includes advanced autonomous capabilities:

- **🐚 Enhanced Shell Commands** - Persistent shell sessions with working directory state
  - Execute commands with `cd` that persists across calls
  - Background process management for long-running tasks
  - Real-time streaming output for commands
  - Configurable timeouts and error handling

- **📋 Task Planning & Management** - Intelligent task tracking and execution
  - Break down complex operations into manageable steps
  - Track task status (pending, in_progress, completed, failed)
  - Dependency resolution and progress visualization
  - Export/import task states for reproducibility

- **⚡ Parallel Tool Execution** - Run multiple tools concurrently
  - Execute up to 5 tools simultaneously
  - Automatic dependency resolution
  - Graceful error handling for parallel operations
  - Sequential and dependency-based execution modes

- **🔗 Tool Chaining** - Build complex multi-step workflows
  - Chain multiple tools with conditional execution
  - Process intermediate results with callbacks
  - Stop on error or continue with fallbacks
  - Compose reusable operation sequences

**New Slash Commands:**
- `/shell <cmd>` or `/sh <cmd>` - Execute shell commands
- `/cwd` or `/pwd` - Show current working directory
- `/bg` or `/background` - List background processes
- `/tasks` - View agent task list and progress

See [AGENT_FEATURES.md](AGENT_FEATURES.md) for detailed documentation.

### 📁 Data Management
- **Persistent History** - Save and resume conversations
- **Export Options** - Export to Markdown, JSON, HTML, or plain text
- **Configuration Management** - Store preferences in `~/.grok-cli/config.json`
- **Session Management** - Load and continue previous conversations
- **Secure API Key Storage** - Multiple options including keytar integration

## 📦 Installation

### Quick Setup (Recommended)

```bash
# Clone the repository
git clone <repository-url>
cd grok-4-cli

# Run the setup script
./setup.sh

# Or manually:
npm install
npm link
```

### Manual Installation

```bash
# Clone the repository
git clone <repository-url>
cd grok-4-cli

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Link CLI globally (optional)
npm link
```

### Required Dependencies

The CLI uses the following packages (automatically installed via `npm install`):

- **Core Functionality**
  - `openai` - API client (OpenAI-compatible)
  - `commander` - CLI framework
  - `dotenv` - Environment variable management
  - `axios` - HTTP client

- **UI & Animations**
  - `chalk` - Terminal styling
  - `ora` - Loading spinners
  - `figlet` - ASCII art text
  - `gradient-string` - Gradient text effects
  - `boxen` - Terminal boxes
  - `cli-progress` - Progress bars
  - `cli-table3` - Formatted tables

- **Interactive Features**
  - `inquirer` - Interactive prompts
  - `readline` - Terminal input

- **Data & Configuration**
  - `fs-extra` - Enhanced file system operations
  - `conf` - Configuration management

- **Content Processing**
  - `marked` - Markdown parsing
  - `marked-terminal` - Terminal markdown rendering
  - `cli-highlight` - Syntax highlighting
  - `highlight.js` - Code highlighting

## 🔧 Configuration

### First-Time Setup (Automatic)

When you run the CLI for the first time without an API key, it will automatically start the setup wizard:

```bash
grok
# Setup wizard will guide you through getting and saving your API key
```

### Getting Your xAI API Key

1. **Visit**: [https://console.x.ai](https://console.x.ai)
2. **Sign in** with your X (Twitter), Google, or xAI account
3. **Navigate to** "API Keys" section
4. **Click** "Create API Key" button
5. **Name** your key (e.g., "grok-cli")
6. **Copy** the generated key (starts with `xai-`)

### API Key Setup Options

1. **Setup Wizard** (Recommended)
   ```bash
   grok config
   # Select "Run setup wizard"
   ```

2. **Environment Variable**
   ```bash
   export XAI_API_KEY="xai-your-key-here"
   ```

3. **Local .env File**
   ```bash
   echo "XAI_API_KEY=xai-your-key-here" > .env
   ```

4. **Secure Config Storage**
   ```bash
   grok config
   # Select "Set/Change API key"
   ```

The CLI checks for API keys in this order:
1. Environment variable (`XAI_API_KEY`)
2. Config file (`~/.config/grok-cli/`)
3. Local `.env` file

### Project Context (GROK.md)

Create a `GROK.md` file in your project root to provide context:

```markdown
# GROK.md
Project-specific instructions and context for Grok...
```

## 🎮 Usage

### Interactive Mode

Start an interactive chat session with all features enabled:

```bash
grok
# Function calling is enabled by default
# Grok can create, read, and modify files automatically
```

### Slash Commands in Interactive Mode

| Command | Description |
|---------|-------------|
| `/help` | Show all available commands |
| `/model` | Switch between Grok models |
| `/clear` | Clear current conversation |
| `/save` | Save conversation to history |
| `/load` | Load previous conversation |
| `/history` | View saved conversations |
| `/search` | Configure Live Search mode |
| `/image <prompt>` | Generate an image |
| `/vision` | Analyze an image |
| `/tools` | Toggle function calling |
| `/config` | Configure settings |
| `/export` | Export conversation |
| `/tokens` | Show token usage |
| `/exit` | Exit the CLI |

### Command Line Mode

#### Basic Chat
```bash
grok chat "What is quantum computing?"
```

#### With Options
```bash
grok chat "Explain AI" --model grok-3-mini --stream --temperature 0.7
```

#### Image Generation
```bash
grok image "A cyberpunk city at night" --number 2
# Images are automatically saved to ./grok-images/
```

#### Vision Analysis
```bash
grok vision ./photo.jpg "What objects are in this image?"
```

#### Live Search
```bash
grok search "Latest AI developments" --source web --country US
```

#### Configuration
```bash
grok config
```

## 🛠️ Advanced Features

### Live Search Integration

Enable real-time search across multiple sources:

```javascript
// In interactive mode
/search
// Select mode: auto, on, or off

// Command line
grok search "query" --source web|news|x
```

### Function Calling

The CLI includes built-in tools for file operations:
- Read files
- Write/Create files (automatic - no approval needed)
- Edit files
- List directories
- Execute commands
- Make HTTP requests

File creation is automatic to enable AI assistance with coding tasks. Other operations follow approval workflow:
- `suggest` mode: Ask for approval for operations (except file creation)
- `auto-edit` mode: Auto-approve edits, ask for others
- `full-auto` mode: Execute all operations automatically

### Export Formats

Export conversations in multiple formats:

```bash
# In interactive mode
/export

# Formats available:
- Markdown (.md)
- JSON (.json)
- HTML (.html) - Beautiful styled output
- Plain Text (.txt)
```

## 📊 Token Usage & Cost Tracking

The CLI automatically tracks token usage and calculates costs:

```
📊 Tokens: 1,234 (Input: 234, Output: 1,000)
💰 Cost: $0.003234
```

### Pricing (as of 2025)

| Model | Input (per 1M tokens) | Output (per 1M tokens) |
|-------|----------------------|------------------------|
| Grok-4 | $3.00 | $15.00 |
| Grok-3 | $3.00 | $15.00 |
| Grok-3-mini | $0.30 | $0.50 |
| Grok-2-image | - | $0.07 per image |

## 🎨 Themes & Customization

The CLI supports multiple gradient themes:
- `cyberpunk` (default)
- `matrix`
- `sunset`
- `ocean`
- `fire`
- `rainbow`

Change theme in config:
```bash
grok config
# Select "Theme"
```

## 📁 File Structure

```
~/.grok-cli/
├── config.json          # User configuration
└── history/            # Saved conversations
    └── session-*.json

./grok-exports/         # Exported conversations
├── *.md
├── *.json
├── *.html
└── *.txt

./grok-images/          # Generated images (auto-created)
└── grok-image-*.png
```

## 🔒 Security

- API keys are never hardcoded
- Approval workflow for file operations
- Secure configuration storage
- Input sanitization
- Rate limit handling with exponential backoff

For responsible disclosure, see SECURITY.md. Use `.env` (ignored by Git) or environment variables for secrets. Enable debug logging by setting `DEBUG=true`.

## 🧰 GitHub Project Hygiene

- `.gitignore` excludes secrets, logs, caches, and local artifacts
- `.gitattributes` enforces LF endings and marks binaries
- Code scanning via CodeQL workflow
- LICENSE included (ISC)

## 🚀 Performance

- 6-minute timeout for reasoning models
- Streaming support for real-time responses
- Efficient token management
- Automatic retry on rate limits
- Progress indicators for long operations

## 📖 API Documentation

For detailed API information, see:
- [xAI API Documentation](https://docs.x.ai)
- [API Pricing](https://x.ai/api)
- `grok-api-docs.md` in this repository

## 🏗️ Project Structure

```
grok-4-cli/
├── grok                    # Main CLI executable
├── grok.backup            # Original CLI backup
├── lib/                   # Utility modules
│   ├── tools.js          # Tool execution & approval workflow
│   ├── animations.js     # UI animations & effects
│   └── export.js         # Export functionality
├── package.json          # Dependencies & metadata
├── README.md            # Documentation
├── GROK.md             # Project context file
├── grok-api-docs.md    # API reference
├── grok4-project.txt   # Project specification
└── .env                # API key (create this)
```

## 🔧 Development

### Running from Source

```bash
# Run directly without global install
node grok

# Or make executable
chmod +x grok
./grok
```

### Adding New Features

1. **New Tools**: Add to `lib/tools.js` TOOL_DEFINITIONS
2. **New Commands**: Add to `processSlashCommand()` in main file
3. **New Themes**: Add to `lib/animations.js` THEMES object

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📄 License

ISC License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with the xAI Grok API
- Inspired by Claude Code and Gemini CLI
- Powered by Node.js and the amazing open-source community

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact via X/Twitter: @yourusername

---

**Made with ❤️ for the AI community**
