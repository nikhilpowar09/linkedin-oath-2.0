// environment.ts
export const environment = {
  production: false,
  backendUrl: 'http://localhost:5000', // Keep this as is unless your backend changes
  linkedin: {
    clientId: "your_linkedin_client_id", // REPLACE with real value in .env or securely injected
    redirectUrl: "http://localhost:4200/linkedInLogin",
    scopes: 'openid profile email w_member_social'
  }
};
