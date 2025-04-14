// environment.ts
export const environment = {
  production: false,
  backendUrl: 'http://localhost:5000', // Remove /api from here
  linkedin: {
    clientId: "86p3ct3bn385w6",
    redirectUrl: "http://localhost:4200/linkedInLogin",
    scopes: 'openid profile email w_member_social'
  }
};
