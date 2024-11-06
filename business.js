const persistance=require("./persistance")


async function addUser(data){
    await persistance.addUser(data)
}

module.exports={
    addUser,
}