var async = require('async'),
    helpers = require('./helpers'),
    should = require('should'),
    dynalite = require('..')

var target = 'DynamoDB_20120810.GetItem',
    request = helpers.request,
    opts = helpers.opts.bind(null, target),
    assertSerialization = helpers.assertSerialization.bind(null, target),
    assertType = helpers.assertType.bind(null, target),
    assertValidation = helpers.assertValidation.bind(null, target),
    assertNotFound = helpers.assertNotFound.bind(null, target)

describe('getItem', function() {

  beforeEach(function(done) {
    dynalite.listen(4567, done)
  })

  afterEach(function(done) {
    dynalite.close(done)
  })

  describe('serializations', function() {

    it('should return SerializationException when TableName is not a string', function(done) {
      assertType('TableName', 'String', done)
    })

    it('should return SerializationException when Key is not a map', function(done) {
      assertType('Key', 'Map', done)
    })

    it('should return SerializationException when Key.Attr is not a struct', function(done) {
      assertType('Key.Attr', 'Structure', done)
    })

    it('should return SerializationException when Key.Attr.S is not a string', function(done) {
      assertType('Key.Attr.S', 'String', done)
    })

    it('should return SerializationException when Key.Attr.B is not a blob', function(done) {
      assertType('Key.Attr.B', 'Blob', done)
    })

    it('should return SerializationException when Key.Attr.N is not a string', function(done) {
      assertType('Key.Attr.N', 'String', done)
    })

    it('should return SerializationException when AttributesToGet is not a list', function(done) {
      assertType('AttributesToGet', 'List', done)
    })

    it('should return SerializationException when ConsistentRead is not a boolean', function(done) {
      assertType('ConsistentRead', 'Boolean', done)
    })

    it('should return SerializationException when ReturnConsumedCapacity is not a string', function(done) {
      assertType('ReturnConsumedCapacity', 'String', done)
    })

  })

  describe('validations', function() {

    it('should return ValidationException for no TableName', function(done) {
      assertValidation({},
        'The paramater \'tableName\' is required but was not present in the request', done)
    })

    it('should return ValidationException for empty TableName', function(done) {
      assertValidation({TableName: ''},
        'TableName must be at least 3 characters long and at most 255 characters long', done)
    })

    it('should return ValidationException for short TableName', function(done) {
      assertValidation({TableName: 'a;'},
        'TableName must be at least 3 characters long and at most 255 characters long', done)
    })

    it('should return ValidationException for long TableName', function(done) {
      var name = '', i
      for (i = 0; i < 256; i++) name += 'a'
      assertValidation({TableName: name},
        'TableName must be at least 3 characters long and at most 255 characters long', done)
    })

    it('should return ValidationException for incorrect attributes', function(done) {
      assertValidation({TableName: 'abc;', ReturnConsumedCapacity: 'hi', AttributesToGet: []},
        '4 validation errors detected: ' +
        'Value \'hi\' at \'returnConsumedCapacity\' failed to satisfy constraint: ' +
        'Member must satisfy enum value set: [TOTAL, NONE]; ' +
        'Value \'[]\' at \'attributesToGet\' failed to satisfy constraint: ' +
        'Member must have length greater than or equal to 1; ' +
        'Value \'abc;\' at \'tableName\' failed to satisfy constraint: ' +
        'Member must satisfy regular expression pattern: [a-zA-Z0-9_.-]+; ' +
        'Value null at \'key\' failed to satisfy constraint: ' +
        'Member must not be null', done)
    })

    it('should return ValidationException for bad key type', function(done) {
      assertValidation({TableName: 'abc', Key: {a: {a: ''}}},
        'Supplied AttributeValue is empty, must contain exactly one of the supported datatypes', done)
    })

    it('should return ValidationException for empty key', function(done) {
      assertValidation({TableName: 'abc', Key: {a: {S: ''}}},
        'One or more parameter values were invalid: An AttributeValue may not contain an empty string.', done)
    })

    it('should return empty response if key has incorrect numeric type', function(done) {
      assertValidation({TableName: 'abc', Key: {a: {N: 'b'}}},
        'The parameter cannot be converted to a numeric value: b', done)
    })

    it.skip('should return empty response if key has incorrect attributes', function(done) {
      var name = 'abc1006858535'
      assertValidation({TableName: name, Key: {b: {S: 'a'}}},
        'The provided key element does not match the schema', done)
    })

    it.skip('should return empty response if key has extra attributes', function(done) {
      var name = 'abc1006858535'
      assertValidation({TableName: name, Key: {a: {S: 'a'}, b: {S: 'a'}}},
        'The provided key element does not match the schema', done)
    })

    it.skip('should return empty response if key is incorrect binary type', function(done) {
      var name = 'abc1006858535'
      assertValidation({TableName: name, Key: {a: {B: 'abcd'}}},
        'The provided key element does not match the schema', done)
    })

    it.skip('should return empty response if key is incorrect numeric type', function(done) {
      var name = 'abc1006858535'
      assertValidation({TableName: name, Key: {a: {N: '1'}}},
        'The provided key element does not match the schema', done)
    })

    it.skip('should return ResourceNotFoundException if table does not exist', function(done) {
      var name = String(Math.random() * 0x100000000)
      assertNotFound({TableName: name, Key: {a: {S: 'a'}}},
        'Requested resource not found', done)
    })

    it.skip('should return ResourceNotFoundException if table is being created', function(done) {
      var name = 'abc' + Math.random() * 0x100000000, table = {
        TableName: name,
        AttributeDefinitions: [{AttributeName: 'a', AttributeType: 'S'}],
        KeySchema: [{KeyType: 'HASH', AttributeName: 'a'}],
        ProvisionedThroughput: {ReadCapacityUnits: 1, WriteCapacityUnits: 1},
      }
      request(helpers.opts('DynamoDB_20120810.CreateTable', table), function(err, res) {
        if (err) return done(err)
        assertNotFound({TableName: name, Key: {a: {S: 'a'}}},
          'Requested resource not found', done)
      })
    })

    it.skip('should return empty response if key does not exist', function(done) {
      var name = 'abc1006858535'
      request(opts({TableName: name, Key: {a: {S: 'a'}}}), function(err, res) {
        if (err) return done(err)
        res.statusCode.should.equal(200)
        res.body.should.eql({})
        done()
      })
    })

    it.skip('should return ConsumedCapacity if specified', function(done) {
      var name = 'abc1006858535'
      request(opts({TableName: name, Key: {a: {S: 'a'}}, ReturnConsumedCapacity: 'TOTAL'}), function(err, res) {
        if (err) return done(err)
        res.statusCode.should.equal(200)
        res.body.should.eql({ConsumedCapacity: {CapacityUnits: 0.5, TableName: name}})
        done()
      })
    })

    it.skip('should return ConsumedCapacity if specified and consistent read is double', function(done) {
      var name = 'abc1006858535'
      request(opts({TableName: name, Key: {a: {S: 'a'}}, ReturnConsumedCapacity: 'TOTAL', ConsistentRead: 0.5}), function(err, res) {
        if (err) return done(err)
        res.statusCode.should.equal(200)
        res.body.should.eql({ConsumedCapacity: {CapacityUnits: 0.5, TableName: name}})
        done()
      })
    })

    it.skip('should return full ConsumedCapacity if specified', function(done) {
      var name = 'abc1006858535'
      request(opts({TableName: name, Key: {a: {S: 'a'}}, ReturnConsumedCapacity: 'TOTAL', ConsistentRead: true}), function(err, res) {
        if (err) return done(err)
        res.statusCode.should.equal(200)
        res.body.should.eql({ConsumedCapacity: {CapacityUnits: 1, TableName: name}})
        done()
      })
    })

    it.skip('should return full ConsumedCapacity if specified and double', function(done) {
      var name = 'abc1006858535'
      request(opts({TableName: name, Key: {a: {S: 'a'}}, ReturnConsumedCapacity: 'TOTAL', ConsistentRead: -1.1}), function(err, res) {
        if (err) return done(err)
        res.statusCode.should.equal(200)
        res.body.should.eql({ConsumedCapacity: {CapacityUnits: 1, TableName: name}})
        done()
      })
    })

  })

})

