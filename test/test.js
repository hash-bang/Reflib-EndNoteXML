var expect = require('chai').expect;
var fs = require('fs');
var rl = require('../index');

describe('reflibEndNoteXML.parse(xml, cb)', function(){
	var resErr, resCount = 0, resCountCalled = 0;

	before(function(next) {
		this.timeout(60 * 1000);
		rl.parse(fs.readFileSync(__dirname + '/data/endnote.xml'))
			.on('error', function(err) {
				resErr = err;
				next();
			})
			.on('ref', function(ref) {
				resCountCalled++;
			})
			.on('end', function(count) {
				resCount = count;
				next();
			});
	});

	it('should not raise an error', function() {
		expect(resErr).to.be.not.ok;
	});

	it('end count should be accurate', function() {
		expect(resCount).to.not.equal(0);
		expect(resCountCalled).to.not.equal(0);
		expect(resCount).to.equal(resCountCalled);
	});
});
