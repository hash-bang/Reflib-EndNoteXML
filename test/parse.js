var expect = require('chai').expect;
var fs = require('fs');
var rl = require('../index');

describe('EndNote XML parser - bad XML', function() {
	var resErr = [];
	before(function(next) {
		rl.parse('blah blah blah')
			.on('error', function(err) {
				// Two errors are raised: one more is sent after the internal parser.end() during first error
				// the second is only emitted with an extra try-catch around parser.write(). 
				resErr.push(err);
				if(resErr.length === 2) next();
			})
			// 'end' doesn't get emitted after errors.
	});

	it('Should return two errors', function() {
		expect(resErr).to.have.lengthOf(2);
		expect(resErr[0]).to.have.property('message').to.have.string('Non-whitespace before first tag.');
		expect(resErr[1]).to.have.property('message').to.have.string('Text data outside of root node.');
	});
});
