const mongodb=require("mongodb")


let client = new mongodb.MongoClient("mongodb+srv://60300344:60300344@web2practice.kgejg.mongodb.net/");
let client_status = false;
let db=undefined
let userCollections=undefined
let sessionData=undefined
let screenTime=undefined
let contacts=undefined
// Function to connect to the database
async function connectDB() {
    if (!client_status) {
        await client.connect();
        client_status = true;
        db=client.db("Project")
        userCollections=db.collection("users")
        sessionData=db.collection("sessionData")
        screenTime=db.collection("screenTime")
        contacts=db.collection("contacts")
    }
}

//Function to create a user,
async function createUser(data) {
    await connectDB();
    try {
        
        await userCollections.insertOne(data);
        
        let screenData = {   // Creating an empty screenTime
            username: username,
            week: 0,         
            year: new Date().getFullYear(), 
            timeSpent: 0   
        };

        const contactsData = {
            userId: username, // Use username as the identifier
            contacts: [],
            blocked: [],
        }
        
        await contacts.insertOne(contactsData)
        await screenTime.insertOne(screenData);
    } catch (error) {
        return false;
    }
}

async function getUserByUsername(username) {
    await connectDB()
    return await userCollections.findOne({ username:username });
}



async function startSession(session){
    await connectDB()
    await sessionData.insertOne(session)

}

async function getSessionKey(key){
    await connectDB()
    return await sessionData.findOne({sessionNumber:key})
}

// Function to update a user by username
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

async function getVerifiedToken(token){
    await connectDB();
    return await userCollections.findOne({verificationToken:token});

}

async function getUsersByLanguages(languagesLearning, blockedList) {
    await connectDB();

    try {
        // Validate input
        if (!Array.isArray(languagesLearning) || !languagesLearning.length) {
            console.error("Invalid languagesLearning input:", languagesLearning);
            return [];
        }
        if (!Array.isArray(blockedList)) {
            console.error("Invalid blockedList input:", blockedList);
            blockedList = [];
        }



        // Perform the query
        const users = await userCollections
            .find({
                languagesFluent: { $in: languagesLearning },
                username: { $nin: blockedList }, // Exclude blocked users
            })
            .toArray();

        return users;
    } catch (error) {
        console.error("Error fetching users by language:", error);
        throw error;
    }
}



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


async function blockUser(userId, blockId) {
    await connectDB();
    try {
        const result = await contacts.updateOne(
            { username: userId },
            { $addToSet: { blocked: blockId } } 
        );
        return result.modifiedCount > 0;
    } catch (error) {
        console.error("Error blocking user:", error);
        return false;
    }
}


async function getContacts(username){
    await connectDB()
    try{
        const result=await contacts.findOne({username:username})
        return result
    } 
    catch(error){
        console.log("error getting the contact")
        return false
    }
}
module.exports={
    createUser,getUserByUsername,startSession,getSessionKey,updateUser,getVerifiedToken,
    getUsersByLanguages,addToContacts,blockUser,getContacts
}