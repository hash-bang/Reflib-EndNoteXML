var expect = require('chai').expect;
var fs = require('fs');
var rl = require('../index');

describe('reflibEndNoteXML.parse(xml, cb)', function(){
	var resErr, res;

	before(function(next) {
		this.timeout(60 * 1000);
		rl.parse(fs.readFileSync(__dirname + '/data/endnote.xml'), function(err, result) {
			console.log('FINISH', err);
			resErr = err;
			res = result;
		});
	});

	it('should not raise an error', function() {
		expect(resErr).to.be.not.ok;
	});

	it('should return an array with contents', function() {
		expect(res).to.be.an('array');
	});
});
