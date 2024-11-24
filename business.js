const persistance=require("./persistance")
const crypto=require("crypto")


/**
 * Hashes a password using SHA1 with a salt.
 *
 * @function hashPassword
 * @param {string} password - The plain text password to hash.
 * @param {string} [salt=null] - The optional salt to use for hashing. If not provided, a new salt will be generated.
 * @returns {string} The hashed password in the format "salt:hash".
 * 
 * @example
 * const hashedPassword = hashPassword("mySecurePassword");
 * console.log(hashedPassword); // "randomSalt:hashedValue"
 * 
 * @example
 * const hashedPassword = hashPassword("mySecurePassword", "existingSalt");
 * console.log(hashedPassword); // "existingSalt:hashedValue"
 */

function hashPassword(password, salt = null) {
    if (!salt) {
        salt = crypto.randomBytes(16).toString("hex");
    }
    const hash = crypto.createHash("sha1");
    hash.update(salt + password);
    return `${salt}:${hash.digest("hex")}`; 
}

/**
 * Verifies if an input password matches a stored hashed password.
 *
 * @function verifyPassword
 * @param {string} inputPassword - The plain text password to verify.
 * @param {string} storedPassword - The hashed password stored in the database, in the format "salt:hash".
 * @returns {boolean} `true` if the password matches, otherwise `false`.
 * 
 * @example
 * const isValid = verifyPassword("mySecurePassword", "randomSalt:hashedValue");
 * console.log(isValid); // true or false
 */

  function verifyPassword(inputPassword, storedPassword) {
    const [salt, originalHash] = storedPassword.split(":");
    const hash = hashPassword(inputPassword, salt); // Hash with the extracted salt
    return hash === storedPassword; // Compare the entire stored password
}

/**
 * Verifies if a user's credentials are correct.
 *
 * @async
 * @function verifyUser
 * @param {string} username - The username of the user.
 * @param {string} password - The plain text password to verify.
 * @returns {Promise<boolean>} `true` if the credentials are valid, otherwise `false`.
 * 
 * @example
 * const isVerified = await verifyUser("john_doe", "mySecurePassword");
 * if (isVerified) {
 *     console.log("User verified successfully.");
 * } else {
 *     console.log("Invalid username or password.");
 * }
 */

async function verifyUser(username,password){
let userDetails=await getUserData(username)
if (userDetails){
        return verifyPassword(password,userDetails.password)
}else{
    return false
}
}

/**
 * Adds a new user to the database after hashing their password.
 *
 * @async
 * @function addUser
 * @param {Object} data - The user data to be added.
 * @param {string} data.username - The username of the new user.
 * @param {string} data.password - The plain text password of the new user.
 * @param {string} data.email - The email of the new user.
 * @param {Array<string>} [data.languagesFluent] - The languages the user is fluent in.
 * @param {Array<string>} [data.languagesLearning] - The languages the user is learning.
 * @param {string} [data.profilePhoto] - The profile photo path of the user.
 * @returns {Promise<void>} Resolves when the user is successfully added.
 *
 * @example
 * await addUser({
 *   username: "john_doe",
 *   password: "securePassword",
 *   email: "john@example.com",
 *   languagesFluent: ["English"],
 *   languagesLearning: ["Spanish"],
 *   profilePhoto: "/uploads/profiles/john.jpg"
 * });
 */
async function addUser(data) {
    data.password = hashPassword(data.password); // Hash password with new salt
    await persistance.createUser(data); // Save user to DB
}


/**
 * Retrieves user data by username.
 *
 * @async
 * @function getUserData
 * @param {string} username - The username of the user to fetch.
 * @returns {Promise<Object|null>} The user data if found, otherwise `null`.
 *
 * @example
 * const user = await getUserData("john_doe");
 * if (user) {
 *   console.log(user);
 * } else {
 *   console.log("User not found");
 * }
 */

async function getUserData(username){
    return await persistance.getUserByUsername(username)
}

/**
 * Starts a new session for a user.
 *
 * @async
 * @function startSession
 * @param {Object} data - The data to associate with the session.
 * @returns {Promise<Object>} The created session data including session ID and expiry time.
 *
 * @example
 * const session = await startSession({ userName: "john_doe" });
 * console.log(session); // { sessionNumber: "uuid", sessionExpiry: Date, data: { userName: "john_doe" } }
 */

async function startSession(data){
    let sessionId=crypto.randomUUID()
    let sessionData={
        sessionNumber:sessionId,
        sessionExpiry: new Date(Date.now() + 1000 * 60*15),
        data:data
    }
    await persistance.startSession(sessionData)
    return sessionData
}

/**
 * Retrieves session data by session key.
 *
 * @async
 * @function getSessionData
 * @param {string} key - The session key to fetch.
 * @returns {Promise<Object|null>} The session data if found, otherwise `null`.
 *
 * @example
 * const session = await getSessionData("uuid");
 * if (session) {
 *   console.log(session);
 * } else {
 *   console.log("Session not found");
 * }
 */

async function getSessionData(key){
    return await persistance.getSessionKey(key)
}

/**
 * Retrieves user data using a verification token.
 *
 * @async
 * @function getTokenData
 * @param {string} token - The verification token to search for.
 * @returns {Promise<Object|null>} The user data if the token is valid, otherwise `null`.
 *
 * @example
 * const user = await getTokenData("verificationToken");
 * if (user) {
 *   console.log(user);
 * } else {
 *   console.log("Invalid or expired token");
 * }
 */

async function getTokenData(token){
    return await persistance.getVerifiedToken(token)
}

/**
 * Updates user data in the database.
 *
 * @async
 * @function updateUser
 * @param {string} username - The username of the user to update.
 * @param {Object} data - The fields to update for the user.
 * @returns {Promise<boolean>} `true` if the update was successful, otherwise `false`.
 *
 * @example
 * const success = await updateUser("john_doe", { email: "new_email@example.com" });
 * if (success) {
 *   console.log("User updated successfully");
 * } else {
 *   console.log("Failed to update user");
 * }
 */

async function updateUser(username,data){
    return await persistance.updateUser(username,data)
}

/**
 * Retrieves users fluent in a set of languages that a user is learning.
 *
 * @async
 * @function getUserByLanguage
 * @param {string} currentUsername - The username of the current user.
 * @param {Array<string>} LearningLanguages - The languages the current user is learning.
 * @param {Array<string>} blockedList - The list of users the current user has blocked.
 * @returns {Promise<Array<Object>>} The list of users matching the criteria.
 *
 * @example
 * const users = await getUserByLanguage("john_doe", ["Spanish"], ["blocked_user"]);
 * console.log(users); // [{ username: "user1", languagesFluent: ["Spanish"], ... }]
 */

async function getUserByLanguage(currentUsername,LearningLanguages,blockedList){
    return await persistance.getUsersByLanguages(currentUsername,LearningLanguages,blockedList)
}

/**
 * Adds a user to the current user's contact list.
 *
 * @async
 * @function addToContacts
 * @param {string} userId - The username of the current user.
 * @param {string} contactId - The username of the user to add to contacts.
 * @returns {Promise<boolean>} `true` if the contact was added successfully, otherwise `false`.
 *
 * @example
 * const success = await addToContacts("john_doe", "jane_doe");
 * if (success) {
 *   console.log("Contact added successfully");
 * } else {
 *   console.log("Failed to add contact");
 * }
 */

async function addToContacts(userId,contactId){
    return await persistance.addToContacts(userId,contactId)
}

/**
 * Blocks a user by adding them to the current user's blocked list and removing them from the contact list.
 *
 * @async
 * @function blockUser
 * @param {string} userId - The username of the current user.
 * @param {string} blockId - The username of the user to block.
 * @returns {Promise<boolean>} `true` if the user was blocked successfully, otherwise `false`.
 *
 * @example
 * const success = await blockUser("john_doe", "jane_doe");
 * if (success) {
 *   console.log("User blocked successfully");
 * } else {
 *   console.log("Failed to block user");
 * }
 */

async function blockUser(userId, blockId){
    return await persistance.blockUser(userId, blockId)
}

/**
 * Retrieves the contact list (contacts and blocked users) for the specified user.
 *
 * @async
 * @function getContacts
 * @param {string} userId - The username of the user whose contacts to fetch.
 * @returns {Promise<Object>} An object containing `contacts` and `blocked` arrays.
 *
 * @example
 * const contacts = await getContacts("john_doe");
 * console.log(contacts.contacts); // ["jane_doe"]
 * console.log(contacts.blocked); // ["blocked_user"]
 */

async function getContacts(userId){
    return await persistance.getContacts(userId)
}

/**
 * Retrieves detailed user information for a list of usernames.
 *
 * @async
 * @function getUsersFromList
 * @param {Array<string>} userList - The list of usernames to fetch.
 * @returns {Promise<Array<Object>>} An array of user objects.
 *
 * @example
 * const users = await getUsersFromList(["jane_doe", "john_doe"]);
 * console.log(users); // [{ username: "jane_doe", ... }, { username: "john_doe", ... }]
 */

async function getUsersFromList(userList){
    return await persistance.getUsersFromList(userList)
}

/**
 * Retrieves the messages exchanged between two users, sorted by timestamp.
 *
 * @async
 * @function getMessages
 * @param {string} sender - The username of the sender.
 * @param {string} receiver - The username of the receiver.
 * @returns {Promise<Array<Object>>} An array of message objects.
 *
 * @example
 * const messages = await getMessages("john_doe", "jane_doe");
 * console.log(messages); // [{ sender: "john_doe", receiver: "jane_doe", message: "Hello!", ... }]
 */

async function getMessages(sender, receiver) {
    return await persistance.getMessages(sender, receiver);
}


/**
 * Sends a message from one user to another.
 *
 * @async
 * @function sendMessage
 * @param {string} sender - The username of the sender.
 * @param {string} receiver - The username of the receiver.
 * @param {string} message - The message content.
 * @returns {Promise<Object>} The result of the message insertion.
 *
 * @example
 * const result = await sendMessage("john_doe", "jane_doe", "Hello!");
 * console.log(result); // { acknowledged: true, insertedId: "..." }
 */

async function sendMessage(sender, receiver, message) {
    const timestamp = new Date();
    return await persistance.sendMessage({ sender, receiver, message, timestamp });
}


/**
 * Unblocks a user by removing them from the current user's blocked list.
 *
 * @async
 * @function unblockUser
 * @param {string} current - The username of the current user.
 * @param {string} blockedUser - The username of the user to unblock.
 * @returns {Promise<boolean>} `true` if the user was unblocked successfully, otherwise `false`.
 *
 * @example
 * const success = await unblockUser("john_doe", "blocked_user");
 * if (success) {
 *   console.log("User unblocked successfully");
 * } else {
 *   console.log("Failed to unblock user");
 * }
 */

async function unblockUser(current, blockedUser){
    return await persistance.unblockUser(current,blockedUser)
}

/**
 * Generates a one-time token for a session and updates the session data.
 *
 * @async
 * @function generateToken
 * @param {string} sessionId - The session ID to associate with the token.
 * @returns {Promise<number>} The generated token.
 *
 * @example
 * const token = await generateToken("sessionId123");
 * console.log(token); // 1234
 */

async function generateToken(sessionId) {
    let token=Math.floor(Math.random()*10000)
    let sessionData=await getSessionData(sessionId)
    sessionData.formToken=token
    await updateSession(sessionId,sessionData)
    return token
}

/**
 * Cancels the one-time token associated with a session by removing it from the session data.
 *
 * @async
 * @function cancelToken
 * @param {string} sessionId - The session ID whose token to cancel.
 * @returns {Promise<boolean>} `true` if the token was successfully removed, otherwise `false`.
 *
 * @example
 * const success = await cancelToken("sessionId123");
 * if (success) {
 *   console.log("Token canceled successfully");
 * } else {
 *   console.log("Failed to cancel token");
 * }
 */

async function cancelToken(sessionId) {
    let sessionData=await getSessionData(sessionId)
    delete sessionData.formToken
    return await updateSession(sessionData,sessionData)
}
    

/**
 * Updates session data for a given session key.
 *
 * @async
 * @function updateSession
 * @param {string} key - The session key to update.
 * @param {Object} data - The updated session data.
 * @returns {Promise<boolean>} `true` if the session was updated successfully, otherwise `false`.
 *
 * @example
 * const success = await updateSession("sessionId123", { sessionExpiry: new Date() });
 * if (success) {
 *   console.log("Session updated successfully");
 * } else {
 *   console.log("Failed to update session");
 * }
 */

async function updateSession(key, data){
    return await persistance.updateSession(key,data)
}


/**
 * Updates the password for a user.
 *
 * @async
 * @function updatePassword
 * @param {string} userId - The username of the user whose password is being updated.
 * @param {string} password - The new plain text password.
 * @returns {Promise<boolean>} `true` if the password was updated successfully, otherwise `false`.
 *
 * @example
 * const success = await updatePassword("john_doe", "newSecurePassword");
 * if (success) {
 *   console.log("Password updated successfully");
 * } else {
 *   console.log("Failed to update password");
 * }
 */

async function updatePassword(userId,password){
    let userData=await getUserData(userId)
    let newPassword=hashPassword(password)
    userData.password=newPassword
    return await updateUser(userId,userData)
}


/**
 * Checks if the user has sent at least one message.
 *
 * @async
 * @function checkFirstConversation
 * @param {string} username - The username to check for message history.
 * @returns {Promise<boolean>} `true` if the user has sent at least one message, otherwise `false`.
 *
 * @example
 * const hasMessages = await checkFirstConversation("john_doe");
 * if (hasMessages) {
 *   console.log("User has started a conversation");
 * } else {
 *   console.log("No messages sent yet");
 * }
 */

async function checkFirstConversation(username) {
    try {
        const messages = await getMessageCount(username)

        return messages > 0;
    } catch (error) {
        console.error("Error checking first conversation:", error);
        return false;
    }
}

/**
 * Assigns badges to a user based on their activities and achievements.
 *
 * @async
 * @function assignBadges
 * @param {string} username - The username of the user to assign badges to.
 * @returns {Promise<Array<string>>} An array of unique badge IDs earned by the user.
 *
 * @example
 * const badges = await assignBadges("john_doe");
 * console.log(badges); // ["badgeId1", "badgeId2"]
 */

async function assignBadges(username) {
    const user = await getUserData(username);
    if (!user) throw new Error("User not found");


    const badges = await getAllBadges();
    const earnedBadges = new Set(user.badges || []);

    for (const badge of badges) {

        if (earnedBadges.has(badge._id.toString())) continue;

        const criteria = badge.criteria;

        if (criteria.totalMessagesSent) {
            const messageCount = await getMessageCount(username);
            if (messageCount >= criteria.totalMessagesSent) {
                earnedBadges.add(badge._id.toString());
            }
        } else if (criteria.messagesExchanged) {
            const hasExchangedMessages = await checkFirstConversation(username);
            if (hasExchangedMessages) {
                earnedBadges.add(badge._id.toString());
            }
        } else if (criteria.languagesLearningCount) {
            if ((user.languagesLearning || []).length > criteria.languagesLearningCount.$gt) {
                earnedBadges.add(badge._id.toString());
            }
        } else if (criteria.contactsAdded) {
            const contactList = await getContacts(username);
            if ((contactList.contacts || []).length >= criteria.contactsAdded) {
                earnedBadges.add(badge._id.toString());
            }
        }
    }


    const uniqueBadges = Array.from(earnedBadges);


    if (uniqueBadges.length > (user.badges || []).length) {
        await updateUser(username, { badges: uniqueBadges });
    }

    return uniqueBadges;
}
    
/**
 * Retrieves the total number of messages sent by a user.
 *
 * @async
 * @function getMessageCount
 * @param {string} username - The username of the user.
 * @returns {Promise<number>} The total count of messages sent by the user.
 *
 * @example
 * const messageCount = await getMessageCount("john_doe");
 * console.log(messageCount); // 100
 */

async function getMessageCount(username) {
    return await persistance.getMessageCount(username)
}

/**
 * Retrieves all available badges from the database.
 *
 * @async
 * @function getAllBadges
 * @returns {Promise<Array<Object>>} An array of badge objects.
 *
 * @example
 * const badges = await getAllBadges();
 * console.log(badges); // [{ _id: "badge1", name: "First Message", ... }, ...]
 */

async function getAllBadges(){
    return await persistance.getAllBadges()
}

/**
 * Removes a specific contact from a user's contact list.
 *
 * @async
 * @function removeContact
 * @param {string} username - The username of the user whose contact is to be removed.
 * @param {string} contactToRemove - The username of the contact to remove.
 * @returns {Promise<boolean>} `true` if the contact was successfully removed, otherwise `false`.
 *
 * @example
 * const success = await removeContact("john_doe", "jane_doe");
 * if (success) {
 *   console.log("Contact removed successfully");
 * } else {
 *   console.log("Failed to remove contact");
 * }
 */

async function removeContact(username, contactToRemove) {
    const userContacts = await getContacts(username);
    if (!userContacts) return false;

    const updatedContacts = userContacts.contacts.filter(contact => contact !== contactToRemove);
    return await persistance.updateContacts(username, { contacts: updatedContacts });
}


module.exports={
    addUser,getUserData,startSession,getSessionData,getTokenData,updateUser,verifyUser,getUserByLanguage,
    addToContacts,blockUser,getContacts,getUsersFromList,getMessages,sendMessage,
    unblockUser,updateSession,generateToken,updateSession,cancelToken,updatePassword,
    assignBadges,getAllBadges,getMessageCount,removeContact
}   