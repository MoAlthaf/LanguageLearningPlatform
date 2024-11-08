const persistance=require("./persistance")


async function addUser(data){
    await persistance.createUser(data)
}


async function getUserData(username){
    return await persistance.getUserByUsername(username)
}

async function getTokenData(token){
    return await persistance.getVerifiedToken(token)
}


async function updateUser(username,updateData){
    return await persistance.updateUser(username,updateData)
}

module.exports={
    addUser,getUserData,updateUser,getTokenData
}