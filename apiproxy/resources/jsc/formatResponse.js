var response = JSON.parse(context.getVariable('response.content'));

var jsonResponse= Object.keys(response.outputParameters).map(function(e) {return response.outputParameters[e]})[0];

print(JSON.stringify(jsonResponse));

if (jsonResponse.length === 0) {
    jsonResponse = {};
} else if (jsonResponse.length == 1) {
    jsonResponse=jsonResponse[0];
}

context.setVariable('response.content', JSON.stringify(jsonResponse));

