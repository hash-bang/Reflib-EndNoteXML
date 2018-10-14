var expect = require('chai').expect;
var fs = require('fs');
var rl = require('../index');

/**
 * This test (stupidly) sends an NBIB File to the XML parser which could happen if the client doesn't use .identify() 
 * 	e.g. if the end-user wants to use Some-NBIB.txt and MyRIS.v2 files, we cannot trust the file ext.
 * 	
 * In v1.3.10, this causes a stack overflow in the error handler, due to the extra parser.end().
 * The error wasn't caught, so would crash the application.
 * I removed the extra parser.end() and added a try-catch around parser.write() which emits another error instead.
 * 
 * With the recursive parser.end() still in place, the try-catch around parser.write() does catch the stack-overflow
 * but only when parsing a string data buffer. When parsing a filestream, the error is still thrown unhandled.
 * 
 * @author Pip Jones
 */

describe('EndNote XML parser - test #4 (incorrect file handling via data string)', function() {
	var resErr = [];
	var expectedErrors = 2;

	before(function(next) {
		this.timeout(60 * 1000);
		data = fs.readFileSync(__dirname + '/data/medline-cancer.nbib');

		rl.parse(data)
		.on('error', function(err) {
			resErr.push(err);
			if(resErr.length === expectedErrors) next();
		})
	});
	
	it('should raise '+expectedErrors+' errors', function() {
		expect(resErr).to.have.lengthOf(expectedErrors);
		expect(resErr[0]).to.have.property('message').to.have.string('Non-whitespace before first tag.');
		expect(resErr[1]).to.have.property('message').to.have.string('Text data outside of root node.');
		// This error would happen instead if recursive parser.end() was left in the error handler
		// expect(resErr[1]).to.have.property('message').to.have.string('Maximum call stack size exceeded'); 
	});
});

describe('EndNote XML parser - test #4 (incorrect file handling via data-stream)', function() {
	var resErr = [];
	var expectedErrors = 1;

	before(function(next) {
		this.timeout(60 * 1000);
		rl.parse(fs.createReadStream(__dirname + '/data/medline-cancer.nbib'))
		.on('error', function(err) {
			resErr.push(err);
			if(resErr.length === expectedErrors) next();
		})
	});

	it('should raise '+expectedErrors+' errors', function() {
		expect(resErr).to.have.lengthOf(expectedErrors);
		expect(resErr[0]).to.have.property('message').to.have.string('Non-whitespace before first tag.');
	});
});
