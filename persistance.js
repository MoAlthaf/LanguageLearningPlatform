const mongodb=require("mongodb")


let client = new mongodb.MongoClient("mongodb+srv://60300344:60300344@web2practice.kgejg.mongodb.net/");
let client_status = false;
let db=undefined
let userCollections=undefined
let sessionData=undefined
let contacts=undefined
let messages=undefined
let badges=undefined


/**
 * Establishes a connection to the MongoDB database and initializes
 * various collections for the application. Ensures the connection is
 * established only once to maintain efficiency.
 * 
 * Collections initialized:
 * - `users`: Stores user data including profile information, credentials, and preferences.
 * - `sessionData`: Manages session data for logged-in users.
 * - `screenTime`: Tracks user screen time for analytical purposes.
 * - `contacts`: Stores user contact lists (friends, blocked users, etc.).
 * - `messages`: Manages user-to-user messages.
 * - `badges`: Stores information about badges available in the system.
 * 
 * @async
 * @function connectDB
 * @returns {Promise<void>} Resolves when the database connection and collections are initialized.
 * @throws {Error} If the database connection fails.
 * 
 * @example
 * // Call this function before performing any database operations
 * await connectDB();
 */

async function connectDB() {
    if (!client_status) {
        await client.connect();
        client_status = true;
        db=client.db("Project")
        userCollections=db.collection("users")
        sessionData=db.collection("sessionData")
        contacts=db.collection("contacts")
        messages=db.collection("messages")
        badges=db.collection("badges")
    }
}


/**
 * Creates a new user in the database by inserting the provided user data into the `users` collection.
 * Additionally, initializes an empty contacts list for the new user in the `contacts` collection.
 * 
 * @async
 * @function createUser
 * @param {Object} data - The user data to be stored in the database.
 * @param {string} data.username - The unique username of the user.
 * @param {string} data.email - The email address of the user.
 * @param {string} data.password - The hashed password of the user.
 * @param {Array<string>} [data.languagesFluent=[]] - The languages the user is fluent in.
 * @param {Array<string>} [data.languagesLearning=[]] - The languages the user is learning.
 * @param {string} [data.profilePhoto=null] - The path to the user's profile photo.
 * @param {boolean} [data.verified=false] - Indicates whether the user is verified.
 * @param {Array<string>} [data.badges=[]] - The badges earned by the user.
 * @param {string} [data.verificationToken=null] - The token for email verification.
 * @param {Date} [data.createdAt=new Date()] - The date when the user was created.
 * @param {Date} [data.updatedAt=new Date()] - The date when the user was last updated.
 * 
 * @returns {Promise<boolean>} Resolves to `true` if the user is created successfully, otherwise `false`.
 * 
 * @throws {Error} If the database operation fails.
 * 
 * @example
 * // Create a new user
 * const userData = {
 *     username: "john_doe",
 *     email: "john@example.com",
 *     password: "hashed_password",
 *     languagesFluent: ["English"],
 *     languagesLearning: ["Spanish"],
 *     profilePhoto: "/uploads/john_doe.jpg",
 *     verified: false,
 *     badges: [],
 *     verificationToken: "random_verification_token",
 *     createdAt: new Date(),
 *     updatedAt: new Date(),
 * };
 * const success = await createUser(userData);
 * if (success) {
 *     console.log("User created successfully");
 * } else {
 *     console.error("Failed to create user");
 * }
 */

async function createUser(data) {
    await connectDB();
    try {
        await userCollections.insertOne(data);
        const contactsData = {
            username: data.username, // Use username as the identifier
            contacts: [],
            blocked: [],
        }
        await contacts.insertOne(contactsData)
    } catch (error) {
        return false;
    }
}

/**
 * Fetches a user's data from the database based on the provided username.
 * 
 * @async
 * @function getUserByUsername
 * @param {string} username - The username of the user to fetch.
 * 
 * @returns {Promise<Object|null>} Resolves to the user data object if the user exists, otherwise `null`.
 * 
 * @throws {Error} If the database operation fails.
 */
async function getUserByUsername(username) {
    await connectDB()
    return await userCollections.findOne({ username:username });
}


/**
 * Starts a new session by inserting the session data into the database.
 * 
 * @async
 * @function startSession
 * @param {Object} session - The session data to be stored in the database.
 * @param {string} session.sessionNumber - A unique identifier for the session.
 * @param {string} session.userName - The username associated with the session.
 * @param {Date} session.sessionExpiry - The expiration date and time of the session.
 * 
 * @returns {Promise<void>} Resolves when the session is successfully created.
 * 
 * @throws {Error} If the database operation fails.
 */

async function startSession(session){
    await connectDB()
    await sessionData.insertOne(session)

}


/**
 * Retrieves a session by its session key from the database.
 * 
 * @async
 * @function getSessionKey
 * @param {string} key - The unique session key to identify the session.
 * 
 * @returns {Promise<Object|null>} The session data object if found, otherwise null.
 * 
 * @throws {Error} If the database operation fails.
 */

async function getSessionKey(key){
    await connectDB()
    return await sessionData.findOne({sessionNumber:key})
}


/**
 * Updates user information in the database.
 * 
 * @async
 * @function updateUser
 * @param {string} username - The username of the user to update.
 * @param {Object} updateData - The fields and values to update in the user's record.
 * 
 * @returns {Promise<boolean>} Returns `true` if the update was successful, `false` otherwise.
 * 
 * @throws {Error} If the database operation fails.
 */

async function updateUser(username, updateData) {
    await connectDB();
    try {
        const result = await userCollections.updateOne(
            { username: username },
            { $set: updateData }     
        );
        return result.modifiedCount > 0; 
    } catch (error) {
        return false;
    }
}

/**
 * Retrieves a user record based on a verification token.
 * 
 * @async
 * @function getVerifiedToken
 * @param {string} token - The verification token associated with the user.
 * 
 * @returns {Promise<Object|null>} Resolves with the user document if found, or `null` if no user matches the token.
 * 
 * @throws {Error} If the database operation fails.
 */

async function getVerifiedToken(token){
    await connectDB();
    return await userCollections.findOne({verificationToken:token});

}

/**
 * Fetches users based on the languages they are fluent in, excluding blocked users, existing contacts, and the requester.
 * 
 * @async
 * @function getUsersByLanguages
 * @param {string} userName - The username of the requester.
 * @param {string[]} languagesLearning - The list of languages the requester wants to learn.
 * @param {string[]} blockedList - The list of usernames the requester has blocked.
 * 
 * @returns {Promise<Object[]>} Resolves with an array of user documents matching the criteria, or an empty array if none are found.
 * 
 * @throws {Error} If the database operation fails.
 * 
 * @example
 * const users = await getUsersByLanguages("johnDoe", ["Spanish", "French"], ["blockedUser1"]);
 * console.log(users); // List of users fluent in the desired languages, excluding blocked and existing contacts.
 */

async function getUsersByLanguages(userName, languagesLearning, blockedList) {
    await connectDB();

    try {
      
        if (!Array.isArray(languagesLearning) || !languagesLearning.length) {
            console.error("Invalid or empty languagesLearning input:", languagesLearning);
            return [];
        }
        if (!Array.isArray(blockedList)) {
            console.error("Invalid blockedList input:", blockedList);
            blockedList = [];
        }

        
        const contactsList = await getContacts(userName);

        const existingContacts = contactsList?.contacts || [];

     
        const users = await userCollections
            .find({
                languagesFluent: { $in: languagesLearning },
                username: { 
                    $nin: [...blockedList, ...existingContacts, userName] 
                }
            })
            .toArray();

        return users;
    } catch (error) {
        console.error("Error fetching users by language:", error);
        throw error;
    }
}



/**
 * Adds a contact to the user's contact list.
 * 
 * @async
 * @function addToContacts
 * @param {string} userId - The username of the user adding the contact.
 * @param {string} contactId - The username of the contact to be added.
 * 
 * @returns {Promise<boolean>} Resolves with `true` if the contact was successfully added, or `false` otherwise.
 * 
 * @throws {Error} If the database operation fails.
 * 
 * @example
 * const isSuccess = await addToContacts("johnDoe", "janeDoe");
 * console.log(isSuccess); // true if the contact was added successfully, false otherwise.
 */

async function addToContacts(userId, contactId) {
    await connectDB();
    try {
        const result = await contacts.updateOne(
            { username: userId },
            { $addToSet: { contacts: contactId } } 
        );
        return result.modifiedCount > 0;
    } catch (error) {
        console.error("Error adding to contacts:", error);
        return false;
    }
}

/**
 * Blocks a user by adding them to the "blocked" list and removing them from the "contacts" list.
 * 
 * @async
 * @function blockUser
 * @param {string} userId - The username of the user performing the block.
 * @param {string} blockId - The username of the user to be blocked.
 * 
 * @returns {Promise<boolean>} Resolves with `true` if the user was successfully blocked, or `false` otherwise.
 * 
 * @throws {Error} If the database operation fails.
 * 
 * @example
 * const isBlocked = await blockUser("johnDoe", "janeDoe");
 * console.log(isBlocked); // true if the user was successfully blocked, false otherwise.
 */

async function blockUser(userId, blockId) {
    await connectDB(); // Ensure database connection
    try {
        // Add the user to the "blocked" list
        const blockResult = await contacts.updateOne(
            { username: userId },
            { $addToSet: { blocked: blockId } }
        );

        // Remove the user from the "contacts" list
        const removeContactResult = await contacts.updateOne(
            { username: userId },
            { $pull: { contacts: blockId } } // Removes blockId from contacts array
        );

        return blockResult.modifiedCount > 0 && removeContactResult.modifiedCount > 0;
    } catch (error) {
        console.error("Error blocking user:", error);
        return false;
    }
}


/**
 * Retrieves the contacts and blocked users for a given username.
 * 
 * @async
 * @function getContacts
 * @param {string} username - The username of the user whose contacts and blocked list are to be retrieved.
 * 
 * @returns {Promise<Object>} Resolves with an object containing `contacts` and `blocked` arrays.
 * If no record exists for the user, returns `{ contacts: [], blocked: [] }`.
 * Resolves with `false` if an error occurs during the database operation.
 * 
 * @throws {Error} If the database operation fails.
 * 
 * @example
 * const userContacts = await getContacts("johnDoe");
 * console.log(userContacts.contacts); // Array of contact usernames
 * console.log(userContacts.blocked);  // Array of blocked usernames
 */

async function getContacts(username){
    await connectDB()
    try{
        const result=await contacts.findOne({username:username})
         return result || { contacts: [], blocked: [] };
    } 
    catch(error){
        console.log("error getting the contact")
        return false
    }
}

/**
 * Retrieves detailed user information for a list of usernames.
 * 
 * @async
 * @function getUsersFromList
 * @param {Array<string>} userList - An array of usernames for which to retrieve user details.
 * 
 * @returns {Promise<Array<Object>>} Resolves with an array of user details objects for the provided usernames.
 * If a username does not exist, its corresponding detail will be `null`.
 * 
 * @throws {Error} If the database operation fails for any username in the list.
 * 
 * @example
 * const userList = ["johnDoe", "janeDoe"];
 * const userDetails = await getUsersFromList(userList);
 * console.log(userDetails); // [{ username: "johnDoe", ... }, { username: "janeDoe", ... }]
 */

async function getUsersFromList(userList){
    await connectDB()
    let userDetails=[]
    for(c of userList){
        userDetails.push(await getUserByUsername(c))
    }
    return userDetails 
}

/**
 * Retrieves messages exchanged between two users, sorted by timestamp.
 * 
 * @async
 * @function getMessages
 * @param {string} sender - The username of the sender.
 * @param {string} receiver - The username of the receiver.
 * 
 * @returns {Promise<Array<Object>>} Resolves with an array of message objects exchanged between the sender and receiver.
 * Each message object includes details like sender, receiver, message content, and timestamp.
 * 
 * @throws {Error} If the database operation fails.
 * 
 * @example
 * const messages = await getMessages("user1", "user2");
 * console.log(messages); 
 * // [
 * //   { sender: "user1", receiver: "user2", message: "Hello!", timestamp: "2024-11-05T10:00:00Z" },
 * //   { sender: "user2", receiver: "user1", message: "Hi there!", timestamp: "2024-11-05T10:05:00Z" }
 * // ]
 */

async function getMessages(sender, receiver) {
    await connectDB();
    return await messages
        .find({
            $or: [
                { sender, receiver },
                { sender: receiver, receiver: sender },
            ],
        })
        .sort({ timestamp: 1 })
        .toArray();
}

/**
 * Sends a message by inserting it into the database.
 * 
 * @async
 * @function sendMessage
 * @param {Object} message - The message object to be stored.
 * @param {string} message.sender - The username of the sender.
 * @param {string} message.receiver - The username of the receiver.
 * @param {string} message.content - The content of the message.
 * @param {Date} message.timestamp - The timestamp when the message was sent.
 * 
 * @returns {Promise<Object>} Resolves with the result of the database insertion.
 * 
 * @throws {Error} If the database operation fails.
 * 
 * @example
 * const message = {
 *   sender: "user1",
 *   receiver: "user2",
 *   content: "Hello!",
 *   timestamp: new Date()
 * };
 * const result = await sendMessage(message);
 * console.log(result); // { acknowledged: true, insertedId: "..." }
 */

async function sendMessage(message) {
    await connectDB();
    return await messages.insertOne(message);
}

/**
 * Unblocks a user by removing them from the current user's blocked list.
 *
 * @async
 * @function unblockUser
 * @param {string} currentUsername - The username of the current user performing the unblock action.
 * @param {string} userToUnblock - The username of the user to be unblocked.
 * 
 * @returns {Promise<boolean>} Resolves to `true` if the unblock operation was successful, otherwise `false`.
 * 
 * @throws {Error} If the database operation fails.
 * 
 * @example
 * const result = await unblockUser("john_doe", "blocked_user");
 * if (result) {
 *   console.log("User successfully unblocked.");
 * } else {
 *   console.log("Failed to unblock user.");
 * }
 */

async function unblockUser(currentUsername, userToUnblock) {
    await connectDB();
    try {
        // Update the contacts collection to remove the user from the blocked list
        const result = await contacts.updateOne(
            { username: currentUsername }, // Find the user's document
            { $pull: { blocked: userToUnblock } } // Remove the userToUnblock from the blocked array
        );

        // Return true if the operation modified the document
        return result.modifiedCount > 0;
    } catch (error) {
        console.error("Error unblocking user:", error);
        return false;
    }
}

/**
 * Updates an existing session by replacing its data in the session collection.
 *
 * @async
 * @function updateSession
 * @param {string} key - The unique session identifier (sessionNumber) to locate the session.
 * @param {Object} data - The updated session data to replace the existing session document.
 * 
 * @returns {Promise<void>} Resolves when the session is successfully updated.
 * 
 * @throws {Error} If the database operation fails.
 * 
 * @example
 * const sessionKey = "123456789";
 * const updatedData = {
 *   sessionNumber: "123456789",
 *   data: { userName: "john_doe" },
 *   sessionExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
 * };
 * 
 * await updateSession(sessionKey, updatedData);
 * console.log("Session updated successfully.");
 */

async function updateSession(key, data) {
    await connectDB()
    await sessionData.replaceOne({sessionNumber: key}, data)
}

/**
 * Retrieves the count of messages sent by a specific user.
 *
 * @async
 * @function getMessageCount
 * @param {string} username - The username of the sender to count their messages.
 * @returns {Promise<number>} The total number of messages sent by the user.
 * @throws {Error} If the database query fails.
 * 
 * @example
 * const messageCount = await getMessageCount("john_doe");
 * console.log(`Messages sent by john_doe: ${messageCount}`);
 */

async function getMessageCount(username) {
    await connectDB();
    const count = await messages.countDocuments({ sender: username });
    return count;
}


/**
 * Fetches all badges from the badges collection.
 *
 * @async
 * @function getAllBadges
 * @returns {Promise<Array<Object>>} An array of badge objects stored in the database.
 * @throws {Error} If the database query fails.
 * 
 * @example
 * const badges = await getAllBadges();
 * console.log("All badges:", badges);
 */

async function getAllBadges() {
    await connectDB();
    try {
        return await badges.find({}).toArray();
    } catch (error) {
        console.error("Error fetching badges:", error);
        throw error;
    }
}

/**
 * Updates the contacts collection for a specific user with new data.
 *
 * @async
 * @function updateContacts
 * @param {string} username - The username of the user whose contacts need to be updated.
 * @param {Object} updateData - The data to update in the user's contacts document.
 * @returns {Promise<Object>} The result of the update operation.
 * @throws {Error} If the update operation fails.
 * 
 * @example
 * const result = await updateContacts("john_doe", { contacts: ["jane_doe"] });
 * if (result.modifiedCount > 0) {
 *     console.log("Contacts updated successfully.");
 * } else {
 *     console.log("No changes were made.");
 * }
 */

async function updateContacts(username, updateData) {
    await connectDB();
    return await contacts.updateOne(
        { username },
        { $set: updateData }
    );
}


module.exports={
    createUser,getUserByUsername,startSession,getSessionKey,updateUser,getVerifiedToken,
    getUsersByLanguages,addToContacts,blockUser,getContacts,getUsersFromList,getMessages,
    sendMessage,unblockUser,updateSession,getMessageCount,getAllBadges,updateContacts
}