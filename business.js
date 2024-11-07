const persistance=require("./persistance")


async function addUser(data){
    await persistance.createUser(data)
}

module.exports={
    addUser,
}