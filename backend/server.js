require('dotenv').config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");
const schedule = require("node-schedule");

const app = express();
app.use(cors());
app.use(express.json());

// LinkedIn API Configuration
const LINKEDIN_API = "https://api.linkedin.com/v2";
const CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;
const REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI;

// In-memory storage (replace with database in production)
const scheduledPosts = [];
const userTokens = {};

// Token Exchange Endpoint
app.post("/getLinkedInToken", async (req, res) => {
  const { code } = req.body;

  try {
    const tokenResponse = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    // Store the access token (in production, use a database)
    userTokens[tokenResponse.data.access_token] = tokenResponse.data;

    return res.json(tokenResponse.data);
  } catch (error) {
    console.error("Error getting access token:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to get access token!" });
  }
});

// Schedule Post Endpoint
app.post("/schedulePost", async (req, res) => {
  const { accessToken, content, scheduledTime } = req.body;

  if (!accessToken || !content || !scheduledTime) {
    return res.status(400).json({ error: "Missing required parameters!" });
  }

  try {
    const postData = {
      author: `urn:li:person:${userTokens[accessToken].sub}`, // User URN
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: "NONE"
        }
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "CONNECTIONS"
      }
    };

    // Schedule the post
    const job = schedule.scheduleJob(new Date(scheduledTime), async () => {
      try {
        const response = await axios.post(
          `${LINKEDIN_API}/ugcPosts`,
          postData,
          {
            headers: {
              "Authorization": `Bearer ${accessToken}`,
              "X-Restli-Protocol-Version": "2.0.0",
              "Content-Type": "application/json"
            }
          }
        );
        console.log("Post published successfully:", response.data);
      } catch (error) {
        console.error("Error publishing post:", error.response?.data || error.message);
      }
    });

    scheduledPosts.push({
      id: job.name,
      content,
      scheduledTime,
      status: "SCHEDULED"
    });

    res.json({ success: true, jobId: job.name });
  } catch (error) {
    console.error("Error scheduling post:", error);
    res.status(500).json({ error: "Failed to schedule post!" });
  }
});

// Get User Posts Endpoint
app.get("/userPosts", async (req, res) => {
  const { accessToken } = req.query;

  try {
    const response = await axios.get(
      `${LINKEDIN_API}/ugcPosts?q=authors&authors=List(${userTokens[accessToken].sub})`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching user posts:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch user posts!" });
  }
});

// Get Post Analytics Endpoint
app.get("/postAnalytics/:postId", async (req, res) => {
  const { accessToken } = req.query;
  const { postId } = req.params;

  try {
    const response = await axios.get(
      `${LINKEDIN_API}/socialActions/${postId}`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "X-Restli-Protocol-Version": "2.0.0"
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error fetching post analytics:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch post analytics!" });
  }
});

// Like/Comment Endpoints
app.post("/interactWithPost", async (req, res) => {
  const { accessToken, postId, action, comment } = req.body;

  try {
    if (action === "like") {
      const response = await axios.post(
        `${LINKEDIN_API}/socialActions/${postId}/likes`,
        {},
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "X-Restli-Protocol-Version": "2.0.0"
          }
        }
      );
      return res.json(response.data);
    } else if (action === "comment" && comment) {
      const response = await axios.post(
        `${LINKEDIN_API}/comments`,
        {
          actor: `urn:li:person:${userTokens[accessToken].sub}`,
          object: postId,
          message: { text: comment }
        },
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "X-Restli-Protocol-Version": "2.0.0",
            "Content-Type": "application/json"
          }
        }
      );
      return res.json(response.data);
    } else {
      return res.status(400).json({ error: "Invalid action or missing comment!" });
    }
  } catch (error) {
    console.error("Error interacting with post:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to interact with post!" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});