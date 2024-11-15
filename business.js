const persistance=require("./persistance")
const crypto=require("crypto")

function hashPassword(password, salt) {
    const hash = crypto.createHash("sha1");
    hash.update(salt + password);
    return hash.digest("hex");
  }


function verifyPassword(inputPassword, storedPassword) {
    const [salt, originalHash] = storedPassword.split(":");
    const hash = hashPassword(inputPassword, salt);
    return hash === originalHash;
  }

async function verifyUser(username,password){
let userDetails=await getUserData(username)
if (userDetails){
        return verifyPassword(password,userDetails.password)
}else{
    return false
}

}

async function addUser(data){
    data.password=hashPassword(data.password)
    await persistance.createUser(data)
}


async function getUserData(username){
    return await persistance.getUserByUsername(username)
}

async function startSession(data){
    let sessionId=crypto.randomUUID()
    let sessionData={
        sessionNumber:sessionId,
        sessionExpiry: new Date(Date.now() + 1000 * 60*15),
        data:data
    }
    await persistance.startSession(sessionData)
    return sessionData
}

async function getSessionData(key){
    return await persistance.getSessionKey(key)
}

async function getTokenData(token){
    return await persistance.getVerifiedToken(token)
}

async function updateUser(username,data){
    return await persistance.updateUser(username,data)
}

async function getUserByLanguage(LearningLanguages,blockedList){
    return await persistance.getUsersByLanguages(LearningLanguages,blockedList)
}

async function addToContacts(userId,contactId){
    return await persistance.addToContacts(userId,contactId)
}

async function blockUser(userId, blockId){
    return await persistance.blockUser(userId, blockId)
}

async function getContacts(userId){
    return await persistance.getContacts(userId)
}

module.exports={
    addUser,getUserData,startSession,getSessionData,getTokenData,updateUser,verifyUser,getUserByLanguage,
    addToContacts,blockUser,getContacts
}   