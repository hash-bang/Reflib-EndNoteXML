var expect = require('chai').expect;
var fs = require('fs');
var rl = require('../index');

describe('EndNote encoding', function() {
	it('should encode URLs as XML', function() {
		expect(rl._escape('http://ovidsp.ovid.com/ovidweb.cgi?T=JS&CSC')).to.equal('http://ovidsp.ovid.com/ovidweb.cgi?T=JS&amp;CSC');
	});
});
