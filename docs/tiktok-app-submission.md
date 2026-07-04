# TikTok App Submission Notes

## Product/scope explanation — max 1000 chars

```text
Rahiel Studios Social Media Planner is a web app for preparing, scheduling, uploading, and publishing approved social media content. Login Kit lets an authorized user connect their TikTok account and confirm the correct profile inside the planner.

Content Posting API is used only after the user selects a TikTok account, adds media/caption details, reviews the post, and starts upload or publishing.

Scopes:
user.info.basic/profile: show connected account identity/profile so users confirm the correct TikTok account.
user.info.stats: show basic account context/analytics.
video.list: reference existing/published TikTok videos for account overview and post management.
video.upload: upload user-selected video media.
video.publish: publish the reviewed video post after user action.

Revision: added Rahiel branding plus visible Privacy, Terms, and Data Deletion pages:
https://planner.rahielstudios.ch/privacy
https://planner.rahielstudios.ch/terms
https://planner.rahielstudios.ch/deletion
```

Character count: 961 including newlines.

## Public URLs

- App: `https://planner.rahielstudios.ch`
- Privacy Policy: `https://planner.rahielstudios.ch/privacy`
- Terms of Service: `https://planner.rahielstudios.ch/terms`
- Data Deletion Instructions: `https://planner.rahielstudios.ch/deletion`

## Before submitting

- Verify latest image is deployed on the server.
- Verify `/privacy`, `/terms`, and `/deletion` are public without login.
- Verify the app/login page loads without 404/500.
- Use the exact text above for the 1000-character product/scope field.
