package com.studywebsite.model;

public enum ActionType {
    // Authentication & Account Lifecycle
    LOGIN_ATTEMPT,
    LOGIN_FAILURE,
    LOGOUT,
    REGISTER_ACCOUNT,
    PASSWORD_RESET_REQUEST,
    UPDATE_PROFILE,
    DELETE_ACCOUNT,

    // Forum Activity
    VIEW_POST,
    CREATE_POST,
    EDIT_POST,
    DELETE_POST,
    CREATE_COMMENT,
    EDIT_COMMENT,
    DELETE_COMMENT,
    LIKE_POST,
    UNLIKE_POST,
    PIN_POST,

    // Resources & Files
    UPLOAD_RESOURCE,
    DOWNLOAD_RESOURCE,
    EDIT_RESOURCE,
    DELETE_RESOURCE,
    BOOKMARK_RESOURCE,
    UNBOOKMARK_RESOURCE,

    // Roadmaps & Nodes
    CREATE_ROADMAP,
    EDIT_ROADMAP,
    DELETE_ROADMAP,
    CLONE_ROADMAP,
    COMPLETE_ROADMAP_NODE,

    // Ratings & Reviews
    VOTE_CRITERIA,
    EDIT_VOTE,
    REMOVE_VOTE,

    // Verification & Trust System
    SUBMIT_VERIFICATION,
    APPROVE_VERIFICATION,
    REJECT_VERIFICATION,
    RECALCULATE_TRUST_SCORE,

    // Moderation & Safety
    REPORT_CONTENT,
    RESOLVE_REPORT,
    BAN_USER,
    UNBAN_USER,

    // Search & Analytics
    SEARCH_QUERY
}