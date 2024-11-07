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

async function getUserByUsername(username) {
    return await userCollections.findOne({ username });
}



module.exports={
    createUser,getUserByUsername
}