# TikTok App Submission Notes

## Product/scope explanation — max 1000 chars

```text
Rahiel Studios Social Media Planner schedules and publishes social media content for client businesses. Each business uses its own workspace and TikTok account. Login Kit lets the authorized user connect the account and confirm the correct profile.

Content Posting API is used only after the user selects the account, adds media and caption, chooses who can see the post and confirms. "Upload" sends a draft to the creator's TikTok inbox. "Direct post" publishes the reviewed post.

Scopes:
user.info.basic: show the connected name, username and avatar.
user.info.stats: follower, following, likes and video counts in analytics.
video.list: find the account's videos for analytics and to match inbox drafts.
video.upload: upload the selected video as an inbox draft.
video.publish: publish the reviewed video after the user confirms.

Changes: removed unused user.info.profile scope. Direct post now needs an explicit privacy choice, has comments off by default and shows the consent line.
```

## Public URLs

- App: `https://planner.rahielstudios.ch`
- Privacy Policy: `https://planner.rahielstudios.ch/privacy`
- Terms of Service: `https://planner.rahielstudios.ch/terms`
- Data Deletion Instructions: `https://planner.rahielstudios.ch/deletion`

## Before submitting

- Verify latest image is deployed on the server.
- Verify `/privacy`, `/terms`, and `/deletion` are public without login.
- Verify the app/login page loads without 404/500.
- Verify legal pages mention TikTok Direct Post limits and SELF_ONLY/private visibility before audit approval.
- Use the exact text above for the 1000-character product/scope field.
