var expect = require('chai').expect;
var fs = require('fs');
var rl = require('../index');

describe('EndNote XML parser - progress', function() {
	it('should detect progress when using strings', function(next) {
		var progressMin;
		var progressMax;

		this.timeout(60 * 1000);
		rl.parse(fs.readFileSync(__dirname + '/data/endnote-sm.xml', 'utf-8'))
			.on('error', function(err) {
				expect(err).to.be.not.ok;
				next();
			})
			.on('progress', function(current, max) {
				if (progressMin === undefined) progressMin = current;
				progressMax = max;
			})
			.on('end', function() {
				expect(progressMin).to.be.above(0);
				expect(progressMax).to.be.above(0);
				next();
			});
	});

	it('should detect progress when using buffers', function(next) {
		var progressMin;
		var progressMax;

		this.timeout(60 * 1000);
		rl.parse(fs.readFileSync(__dirname + '/data/endnote-sm.xml'))
			.on('error', function(err) {
				expect(err).to.be.not.ok;
				next();
			})
			.on('progress', function(current, max) {
				if (progressMin === undefined) progressMin = current;
				progressMax = max;
			})
			.on('end', function() {
				expect(progressMin).to.be.above(0);
				expect(progressMax).to.be.above(0);
				next();
			});
	});

	it('should detect progress when using streams', function(next) {
		var progressMin;
		var progressMax;

		this.timeout(60 * 1000);
		rl.parse(fs.createReadStream(__dirname + '/data/endnote-sm.xml'))
			.on('error', function(err) {
				expect(err).to.be.not.ok;
				next();
			})
			.on('progress', function(current, max) {
				if (progressMin === undefined) progressMin = current;
				progressMax = max;
			})
			.on('end', function() {
				expect(progressMin).to.be.above(0);
				expect(progressMax).to.be.equal(27626);
				next();
			});
	});
});
