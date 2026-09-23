import { ephemeralVault } from "../core/auth/keyVault";

export interface GitHubConfig {
  username: string;
  repoName: string;
  token: string;
  hasValidToken: boolean;
  isDemoMode: boolean;
}

export const getGitHubConfig = (): GitHubConfig => {
  const username = typeof localStorage !== "undefined"
    ? localStorage.getItem("af_github_username") || "craighckby-stack"
    : "craighckby-stack";

  const repoName = typeof localStorage !== "undefined"
    ? localStorage.getItem("af_github_repo") || "AetherForge-2"
    : "AetherForge-2";

  // Prioritize EphemeralSessionVault / sessionStorage over localStorage
  const token = ephemeralVault.getKey("github_token") ||
    (typeof sessionStorage !== "undefined" ? sessionStorage.getItem("af_github_token") : "") ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("af_github_token") : "") || "";

  // GitHub tokens typically start with ghp_, github_pat_, or are >= 20 characters
  const hasValidToken = token.trim().length >= 20;

  return {
    username: username.trim(),
    repoName: repoName.trim(),
    token: token.trim(),
    hasValidToken,
    isDemoMode: username === "craighckby-stack" && repoName === "AetherForge-2" && !hasValidToken
  };
};

export const setSessionGitHubToken = (token: string): void => {
  ephemeralVault.setKey("github_token", token.trim());
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem("af_github_token", token.trim());
  }
};

export const clearSessionGitHubToken = (): void => {
  ephemeralVault.clearSessionCredentials();
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem("af_github_token");
  }
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("af_github_token");
  }
};
