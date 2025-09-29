import { HttpClient } from '../utils/httpClient.js';
import { handleApiError } from '../utils/errorHandler.js';
import { validateGitHubUsername, validateGitHubOwnerRepo, validateString, validateNumber } from '../utils/validator.js';

export class GitHubAPI {
  constructor() {
    this.client = new HttpClient('github');
    this.apiName = 'github';
  }

  /**
   * Get user profile information
   * @param {string} username - GitHub username
   */
  async getUserProfile(username) {
    try {
      validateGitHubUsername(username);
      
      const data = await this.client.get(`/users/${username}`);
      
      return {
        success: true,
        data: {
          id: data.id,
          username: data.login,
          name: data.name,
          email: data.email,
          bio: data.bio,
          location: data.location,
          company: data.company,
          blog: data.blog,
          twitter: data.twitter_username,
          followers: data.followers,
          following: data.following,
          publicRepos: data.public_repos,
          publicGists: data.public_gists,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          avatarUrl: data.avatar_url,
          htmlUrl: data.html_url
        }
      };
    } catch (error) {
      return {
        success: false,
        ...handleApiError(error, this.apiName)
      };
    }
  }

  /**
   * List user's repositories
   * @param {string} username - GitHub username
   * @param {object} options - Query options
   */
  async listUserRepos(username, options = {}) {
    try {
      validateGitHubUsername(username);
      
      const params = {
        type: options.type || 'all', // all, owner, member
        sort: options.sort || 'updated', // created, updated, pushed, full_name
        direction: options.direction || 'desc', // asc, desc
        per_page: Math.min(options.perPage || 30, 100),
        page: options.page || 1
      };
      
      const data = await this.client.get(`/users/${username}/repos`, params);
      
      return {
        success: true,
        data: data.map(repo => ({
          id: repo.id,
          name: repo.name,
          fullName: repo.full_name,
          description: repo.description,
          language: repo.language,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          watchers: repo.watchers_count,
          size: repo.size,
          defaultBranch: repo.default_branch,
          isPrivate: repo.private,
          isFork: repo.fork,
          isArchived: repo.archived,
          isDisabled: repo.disabled,
          hasIssues: repo.has_issues,
          hasWiki: repo.has_wiki,
          hasPages: repo.has_pages,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          pushedAt: repo.pushed_at,
          cloneUrl: repo.clone_url,
          htmlUrl: repo.html_url,
          homepage: repo.homepage,
          topics: repo.topics || []
        })),
        pagination: {
          page: params.page,
          perPage: params.per_page,
          hasMore: data.length === params.per_page
        }
      };
    } catch (error) {
      return {
        success: false,
        ...handleApiError(error, this.apiName)
      };
    }
  }

  /**
   * Get detailed repository information
   * @param {string} ownerRepo - Repository in format "owner/repo"
   */
  async getRepoInfo(ownerRepo) {
    try {
      validateGitHubOwnerRepo(ownerRepo);
      
      const data = await this.client.get(`/repos/${ownerRepo}`);
      
      return {
        success: true,
        data: {
          id: data.id,
          name: data.name,
          fullName: data.full_name,
          description: data.description,
          language: data.language,
          languages_url: data.languages_url,
          stars: data.stargazers_count,
          forks: data.forks_count,
          watchers: data.watchers_count,
          openIssues: data.open_issues_count,
          size: data.size,
          defaultBranch: data.default_branch,
          isPrivate: data.private,
          isFork: data.fork,
          isArchived: data.archived,
          isDisabled: data.disabled,
          hasIssues: data.has_issues,
          hasWiki: data.has_wiki,
          hasPages: data.has_pages,
          hasProjects: data.has_projects,
          hasDiscussions: data.has_discussions,
          allowForking: data.allow_forking,
          allowMergeCommit: data.allow_merge_commit,
          allowSquashMerge: data.allow_squash_merge,
          allowRebaseMerge: data.allow_rebase_merge,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          pushedAt: data.pushed_at,
          cloneUrl: data.clone_url,
          sshUrl: data.ssh_url,
          htmlUrl: data.html_url,
          homepage: data.homepage,
          topics: data.topics || [],
          license: data.license ? {
            key: data.license.key,
            name: data.license.name,
            spdxId: data.license.spdx_id
          } : null,
          owner: {
            id: data.owner.id,
            username: data.owner.login,
            type: data.owner.type,
            avatarUrl: data.owner.avatar_url,
            htmlUrl: data.owner.html_url
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        ...handleApiError(error, this.apiName)
      };
    }
  }

  /**
   * Search repositories
   * @param {string} query - Search query
   * @param {object} options - Search options
   */
  async searchRepos(query, options = {}) {
    try {
      validateString(query, 'query', 1, 256);
      
      const params = {
        q: query,
        sort: options.sort || 'stars', // stars, forks, help-wanted-issues, updated
        order: options.order || 'desc', // asc, desc
        per_page: Math.min(options.perPage || 30, 100),
        page: options.page || 1
      };
      
      const data = await this.client.get('/search/repositories', params);
      
      return {
        success: true,
        data: {
          totalCount: data.total_count,
          incompleteResults: data.incomplete_results,
          repositories: data.items.map(repo => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            watchers: repo.watchers_count,
            score: repo.score,
            isPrivate: repo.private,
            isFork: repo.fork,
            createdAt: repo.created_at,
            updatedAt: repo.updated_at,
            pushedAt: repo.pushed_at,
            htmlUrl: repo.html_url,
            topics: repo.topics || [],
            owner: {
              username: repo.owner.login,
              type: repo.owner.type,
              avatarUrl: repo.owner.avatar_url
            }
          }))
        },
        pagination: {
          page: params.page,
          perPage: params.per_page,
          totalCount: data.total_count
        }
      };
    } catch (error) {
      return {
        success: false,
        ...handleApiError(error, this.apiName)
      };
    }
  }

  /**
   * Get repository issues
   * @param {string} ownerRepo - Repository in format "owner/repo"
   * @param {object} options - Query options
   */
  async getRepoIssues(ownerRepo, options = {}) {
    try {
      validateGitHubOwnerRepo(ownerRepo);
      
      const params = {
        state: options.state || 'open', // open, closed, all
        sort: options.sort || 'created', // created, updated, comments
        direction: options.direction || 'desc', // asc, desc
        per_page: Math.min(options.perPage || 30, 100),
        page: options.page || 1
      };
      
      if (options.labels) {
        params.labels = Array.isArray(options.labels) ? options.labels.join(',') : options.labels;
      }
      
      const data = await this.client.get(`/repos/${ownerRepo}/issues`, params);
      
      return {
        success: true,
        data: data.map(issue => ({
          id: issue.id,
          number: issue.number,
          title: issue.title,
          body: issue.body,
          state: issue.state,
          locked: issue.locked,
          comments: issue.comments,
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
          closedAt: issue.closed_at,
          htmlUrl: issue.html_url,
          labels: issue.labels.map(label => ({
            id: label.id,
            name: label.name,
            color: label.color,
            description: label.description
          })),
          assignees: issue.assignees.map(assignee => ({
            id: assignee.id,
            username: assignee.login,
            avatarUrl: assignee.avatar_url
          })),
          author: {
            id: issue.user.id,
            username: issue.user.login,
            avatarUrl: issue.user.avatar_url
          },
          isPullRequest: !!issue.pull_request
        })),
        pagination: {
          page: params.page,
          perPage: params.per_page,
          hasMore: data.length === params.per_page
        }
      };
    } catch (error) {
      return {
        success: false,
        ...handleApiError(error, this.apiName)
      };
    }
  }
}