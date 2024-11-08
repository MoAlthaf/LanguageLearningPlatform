const mongodb=require("mongodb")


let client = new mongodb.MongoClient("mongodb+srv://60300344:60300344@web2practice.kgejg.mongodb.net/");
let client_status = false;
let db=undefined
let userCollections=undefined

// Function to connect to the database
async function connectDB() {
    if (!client_status) {
        await client.connect();
        client_status = true;
        db=client.db("Project")
        userCollections=db.collection("users")
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


async function getUserByUsername(username) {
    await connectDB()
    return await userCollections.findOne({ username:username });
}



module.exports={
    createUser,getUserByUsername,updateUser,getVerifiedToken
}