const mongodb=requre("mongodb")


let client = new mongodb.MongoClient("mongodb+srv://60300344:60300344@web2practice.kgejg.mongodb.net/");
let client_status = false;
let db=undefined
// Function to connect to the database
async function connectDB() {
    if (!client_status) {
        await client.connect();
        client_status = true;
        db=client.db("Project")
    }
}

async function createUser(data){
    await connectDB()
    let userCollections=db.collection("user_collections")
    try{
        await userCollections.add(data)
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