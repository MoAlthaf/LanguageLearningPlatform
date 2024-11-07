const persistance=require("./persistance")


async function addUser(data){
    await persistance.createUser(data)
}


async function getUserData(username){
    return await persistance.getUserByUsername(username)
}

module.exports={
    addUser,getUserData
}