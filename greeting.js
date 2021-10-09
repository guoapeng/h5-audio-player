function greeting() {
    console.log("hello, world");
}

function add(a, b) {
    result = a + b;
    console.log(a + " + " + b + " =" + result);
    return result;
}

module.exports.greeting = greeting;
module.exports.add = add;