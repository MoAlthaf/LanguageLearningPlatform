const mongodb=require("mongodb")


let client = new mongodb.MongoClient("mongodb+srv://60300344:60300344@web2practice.kgejg.mongodb.net/");
let client_status = false;
let db=undefined
let userCollections=undefined
let sessionData=undefined
let screenTime=undefined

// Function to connect to the database
async function connectDB() {
    if (!client_status) {
        await client.connect();
        client_status = true;
        db=client.db("Project")
        userCollections=db.collection("users")
        sessionData=db.collection("sessionData")
        screenTime=db.collection("screenTime")
    }
}

//Function to create a user,
async function createUser(data) {
    await connectDB();
    try {
        // Insert the user and retrieve the inserted document's ObjectId
        await userCollections.insertOne(data);
        // Create an empty screenTime entry with just the userId
        let screenData = {
            username: username,
            week: 0,         
            year: new Date().getFullYear(), 
            timeSpent: 0   
        };
        
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


module.exports={
    createUser,getUserByUsername,startSession,getSessionKey,updateUser,getVerifiedToken,
}