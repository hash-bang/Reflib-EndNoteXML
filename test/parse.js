var expect = require('chai').expect;
var fs = require('fs');
var rl = require('../index');

describe('EndNote XML parser - bad XML', function() {
	var resErr;
	before(function(next) {
		rl.parse('blah blah blah')
			.on('error', function(err) {
				resErr = err;
				next();
			})
			.on('end', function(count) {
				next();
			});
	});

	it('Should return an error', function() {
		expect(resErr).to.be.ok;
	});
});
