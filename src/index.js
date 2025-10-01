import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { config, validateConfig } from "./config/settings.js";
import { GitHubAPI } from "./apis/github.js";

// Initialize APIs
const githubApi = new GitHubAPI();

// Create server instance
const server = new Server(
  {
    name: config.server.name,
    version: config.server.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "github-get-user",
                description: "Get GitHub user profile information",
                inputSchema: {
                    type: "object",
                    properties: {
                        username: {
                            type: "string",
                            description: "GitHub username to lookup",
                            pattern: "^[a-zA-Z0-9]([a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$"
                        }
                    },
                    required: ["username"]
                }
            },
            {
                name: "github-list-repos",
                description: "List repositories for a GitHub user",
                inputSchema: {
                    type: "object",
                    properties: {
                        username: {
                            type: "string",
                            description: "GitHub username",
                            pattern: "^[a-zA-Z0-9]([a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$"
                        },
                        type: {
                            type: "string",
                            description: "Repository type",
                            enum: ["all", "owner", "member"],
                            default: "all"
                        },
                        sort: {
                            type: "string",
                            description: "Sort repositories by",
                            enum: ["created", "updated", "pushed", "full_name"],
                            default: "updated"
                        },
                        direction: {
                            type: "string",
                            description: "Sort direction",
                            enum: ["asc", "desc"],
                            default: "desc"
                        },
                        perPage: {
                            type: "number",
                            description: "Number of repositories per page (max 100)",
                            minimum: 1,
                            maximum: 100,
                            default: 30
                        },
                        page: {
                            type: "number",
                            description: "Page number",
                            minimum: 1,
                            default: 1
                        }
                    },
                    required: ["username"]
                }
            },
            {
                name: "github-get-repo",
                description: "Get detailed information about a GitHub repository",
                inputSchema: {
                    type: "object",
                    properties: {
                        repository: {
                            type: "string",
                            description: "Repository in format 'owner/repo'",
                            pattern: "^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$"
                        }
                    },
                    required: ["repository"]
                }
            },
            {
                name: "github-search-repos",
                description: "Search GitHub repositories",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Search query (can include qualifiers like 'language:javascript')",
                            minLength: 1,
                            maxLength: 256
                        },
                        sort: {
                            type: "string",
                            description: "Sort results by",
                            enum: ["stars", "forks", "help-wanted-issues", "updated"],
                            default: "stars"
                        },
                        order: {
                            type: "string",
                            description: "Sort order",
                            enum: ["asc", "desc"],
                            default: "desc"
                        },
                        perPage: {
                            type: "number",
                            description: "Number of results per page (max 100)",
                            minimum: 1,
                            maximum: 100,
                            default: 30
                        },
                        page: {
                            type: "number",
                            description: "Page number",
                            minimum: 1,
                            default: 1
                        }
                    },
                    required: ["query"]
                }
            },
            {
                name: "github-get-issues",
                description: "Get issues from a GitHub repository",
                inputSchema: {
                    type: "object",
                    properties: {
                        repository: {
                            type: "string",
                            description: "Repository in format 'owner/repo'",
                            pattern: "^[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+$"
                        },
                        state: {
                            type: "string",
                            description: "Issue state",
                            enum: ["open", "closed", "all"],
                            default: "open"
                        },
                        labels: {
                            type: "string",
                            description: "Comma-separated list of label names"
                        },
                        sort: {
                            type: "string",
                            description: "Sort issues by",
                            enum: ["created", "updated", "comments"],
                            default: "created"
                        },
                        direction: {
                            type: "string",
                            description: "Sort direction",
                            enum: ["asc", "desc"],
                            default: "desc"
                        },
                        perPage: {
                            type: "number",
                            description: "Number of issues per page (max 100)",
                            minimum: 1,
                            maximum: 100,
                            default: 30
                        },
                        page: {
                            type: "number",
                            description: "Page number",
                            minimum: 1,
                            default: 1
                        }
                    },
                    required: ["repository"]
                }
            }
        ]
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
        switch (name) {
            case "github-get-user":
                const userResult = await githubApi.getUserProfile(args.username);
                return {
                    content: [
                        {
                            type: "text",
                            text: userResult.success 
                                ? `GitHub User: ${userResult.data.username}\n` +
                                  `Name: ${userResult.data.name || 'N/A'}\n` +
                                  `Bio: ${userResult.data.bio || 'N/A'}\n` +
                                  `Location: ${userResult.data.location || 'N/A'}\n` +
                                  `Company: ${userResult.data.company || 'N/A'}\n` +
                                  `Public Repos: ${userResult.data.publicRepos}\n` +
                                  `Followers: ${userResult.data.followers}\n` +
                                  `Following: ${userResult.data.following}\n` +
                                  `Profile: ${userResult.data.htmlUrl}`
                                : `Error: ${userResult.message}`
                        }
                    ]
                };

            case "github-list-repos":
                const reposResult = await githubApi.listUserRepos(args.username, args);
                return {
                    content: [
                        {
                            type: "text",
                            text: reposResult.success 
                                ? `Repositories for ${args.username}:\n\n` +
                                  reposResult.data.map(repo => 
                                    `• ${repo.name} (${repo.language || 'Unknown'})\n` +
                                    `  ⭐ ${repo.stars} | 🍴 ${repo.forks} | 👁️ ${repo.watchers}\n` +
                                    `  ${repo.description || 'No description'}\n` +
                                    `  ${repo.htmlUrl}\n`
                                  ).join('\n') +
                                  `\nPage ${reposResult.pagination.page} | ${reposResult.pagination.hasMore ? 'More available' : 'End of results'}`
                                : `Error: ${reposResult.message}`
                        }
                    ]
                };

            case "github-get-repo":
                const repoResult = await githubApi.getRepoInfo(args.repository);
                return {
                    content: [
                        {
                            type: "text",
                            text: repoResult.success 
                                ? `Repository: ${repoResult.data.fullName}\n` +
                                  `Description: ${repoResult.data.description || 'No description'}\n` +
                                  `Language: ${repoResult.data.language || 'Unknown'}\n` +
                                  `⭐ Stars: ${repoResult.data.stars}\n` +
                                  `🍴 Forks: ${repoResult.data.forks}\n` +
                                  `👁️ Watchers: ${repoResult.data.watchers}\n` +
                                  `🐛 Open Issues: ${repoResult.data.openIssues}\n` +
                                  `📝 Size: ${repoResult.data.size} KB\n` +
                                  `🌿 Default Branch: ${repoResult.data.defaultBranch}\n` +
                                  `🏷️ Topics: ${repoResult.data.topics.join(', ') || 'None'}\n` +
                                  `📅 Created: ${new Date(repoResult.data.createdAt).toLocaleDateString()}\n` +
                                  `🔄 Updated: ${new Date(repoResult.data.updatedAt).toLocaleDateString()}\n` +
                                  `🔗 URL: ${repoResult.data.htmlUrl}`
                                : `Error: ${repoResult.message}`
                        }
                    ]
                };

            case "github-search-repos":
                const searchResult = await githubApi.searchRepos(args.query, args);
                return {
                    content: [
                        {
                            type: "text",
                            text: searchResult.success 
                                ? `Search Results for "${args.query}" (${searchResult.data.totalCount} total):\n\n` +
                                  searchResult.data.repositories.map(repo => 
                                    `• ${repo.fullName} (${repo.language || 'Unknown'})\n` +
                                    `  ⭐ ${repo.stars} | 🍴 ${repo.forks} | Score: ${repo.score.toFixed(2)}\n` +
                                    `  ${repo.description || 'No description'}\n` +
                                    `  ${repo.htmlUrl}\n`
                                  ).join('\n') +
                                  `\nPage ${searchResult.pagination.page} of ${Math.ceil(searchResult.pagination.totalCount / searchResult.pagination.perPage)}`
                                : `Error: ${searchResult.message}`
                        }
                    ]
                };

            case "github-get-issues":
                const issuesResult = await githubApi.getRepoIssues(args.repository, args);
                return {
                    content: [
                        {
                            type: "text",
                            text: issuesResult.success 
                                ? `Issues for ${args.repository} (${args.state || 'open'}):\n\n` +
                                  issuesResult.data.map(issue => 
                                    `#${issue.number} ${issue.title}\n` +
                                    `  State: ${issue.state} | Comments: ${issue.comments}\n` +
                                    `  Author: ${issue.author.username}\n` +
                                    `  Labels: ${issue.labels.map(l => l.name).join(', ') || 'None'}\n` +
                                    `  Created: ${new Date(issue.createdAt).toLocaleDateString()}\n` +
                                    `  ${issue.htmlUrl}\n`
                                  ).join('\n') +
                                  `\nPage ${issuesResult.pagination.page} | ${issuesResult.pagination.hasMore ? 'More available' : 'End of results'}`
                                : `Error: ${issuesResult.message}`
                        }
                    ]
                };

            default:
                throw new Error(`Unknown tool: ${name}`);
        }
    } catch (error) {
        return {
            content: [
                {
                    type: "text",
                    text: `Error executing ${name}: ${error.message}`
                }
            ],
            isError: true
        };
    }
});

async function startServer() {
    // Validate configuration (but don't log to stdout)
    const isConfigValid = validateConfig();
    if (!isConfigValid) {
        console.error("Configuration validation failed. Some features may not work properly.");
    }
    
    // Log to stderr so it doesn't interfere with MCP JSON protocol
    console.error(`Starting ${config.server.name} v${config.server.version}...`);
    console.error(`GitHub API: ${config.env.GITHUB_TOKEN ? 'Configured' : 'Not configured (public access only)'}`);
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    console.error("Universal API Gateway MCP Server is running!");
}

startServer().catch(error => {
    console.error("Failed to start server:", error);
    process.exit(1);
});