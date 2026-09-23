export const getGitHubConfig = () => {
  const username = localStorage.getItem("af_github_username") || "craighckby-stack";
  const repoName = localStorage.getItem("af_github_repo") || "Simulation-";
  const token = sessionStorage.getItem("af_github_token") || 
                localStorage.getItem("af_github_token") || "";

  return {
    username,
    repoName,
    token,
    hasValidToken: token.length > 15,
    isDemoMode: username === "craighckby-stack" && repoName === "Simulation-"
  };
};
