// environment.ts
export const environment = {
  production: false,
  backendUrl: 'http://localhost:5000', // Keep this as is unless your backend changes
  linkedin: {
    clientId: "86p3ct3bn385w6", // Use the real LinkedIn client ID
    redirectUrl: "http://localhost:4200/linkedInLogin",
    scopes: 'openid profile email w_member_social'
  }
};
