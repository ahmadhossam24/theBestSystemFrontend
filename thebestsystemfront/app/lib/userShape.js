/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} password
 * @property {string} username
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} email
 * @property {string} role
 * @property {string} name
 * @property {string} agent_role
 * @property {string} last_login
 * @property {boolean} is_superuser
 * @property {boolean} is_staff
 * @property {boolean} is_active
 * @property {string} date_joined
 * @property {string} user_information
 * @property {string} date_created
 * @property {boolean} is_deleted
 * @property {string} date_deleted
 * @property {UserSummary} creator
 * @property {UserSummary} deleter
 * @property {BranchSummary} branch
 * @property {TeamSummary} team
 */

/**
 * @typedef {Object} UserSummary
 * @property {string} id
 * @property {string} username
 * @property {string} first_name
 * @property {string} last_name
 * @property {string} email
 * @property {string} role
 * @property {string} name
 * @property {string} agent_role
 */

/**
 * @typedef {Object} BranchSummary
 * @property {string} id
 * @property {string} name
 * @property {string} location
 */

/**
 * @typedef {Object} TeamSummary
 * @property {string} id
 * @property {string} name
 */
