const mongodb=require("mongodb")


let client = new mongodb.MongoClient("mongodb+srv://60300344:60300344@web2practice.kgejg.mongodb.net/");
let client_status = false;
let db=undefined
let userCollections=undefined
let sessionData=undefined

// Function to connect to the database
async function connectDB() {
    if (!client_status) {
        await client.connect();
        client_status = true;
        db=client.db("Project")
        userCollections=db.collection("users")
        sessionData=db.collection("sessionData")
    }
}

//Function to create a user,
async function createUser(data){
    await connectDB()
    try{
        await userCollections.insertOne(data)
        return true
    }catch{
        return false
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



module.exports={
    createUser,getUserByUsername,startSession,getSessionKey
}