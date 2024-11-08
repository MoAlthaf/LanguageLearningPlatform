const persistance=require("./persistance")
const crypto=require("crypto")


async function addUser(data){
    await persistance.createUser(data)
}


async function getUserData(username){
    return await persistance.getUserByUsername(username)
}

async function startSession(data){
    let sessionId=crypto.randomUUID()
    let sessionData={
        sessionNumber:sessionId,
        sessionExpiry: new Date(Date.now() + 1000 * 60*10),
        data:data
    }
    await persistance.startSession(sessionData)
    return sessionData
}

async function getSessionData(key){
    return await persistance.getSessionKey(key)
}

module.exports={
    addUser,getUserData,startSession,getSessionData
}