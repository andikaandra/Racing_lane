THREE.Car = ( function ( ) {

	var steeringWheelSpeed = 1.5;
	var maxSteeringRotation = 0.6;

	var acceleration = 0;

	var maxSpeedReverse, accelerationReverse, deceleration;

	var controlKeys = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, BRAKE: 32, LEFT1: 65, UP1: 87, RIGHT1: 68, DOWN1: 83 };

	var wheelOrientation = 0;
	var carOrientation = 0;

	var root = null;

	var frontLeftWheelRoot = null;
	var frontRightWheelRoot = null;

	var frontLeftWheel = new THREE.Group();
	var frontRightWheel = new THREE.Group();
	var backLeftWheel = null;
	var backRightWheel = null;

	var steeringWheel = null;

	var wheelDiameter = 1;
	var length = 1;

	var loaded = false;

	var controls = {
		brake: false,
		moveForward: false,
		moveBackward: false,
		moveLeft: false,
		moveRight: false
	};

	function Car( maxSpeed, acceleration, brakePower, turningRadius, keys ) {
		this.enabled = true;

		this.elemNames = {
			flWheel: 'wheel_fl',
			frWheel: 'wheel_fr',
			rlWheel: 'wheel_rl',
			rrWheel: 'wheel_rr',
			steeringWheel: 'steering_wheel',
		};

		this.maxSpeed = maxSpeed || 30;
		maxSpeedReverse = - this.maxSpeed * 0.25;

		this.acceleration = acceleration || 10;
		accelerationReverse = this.acceleration * 0.5;

		this.turningRadius = turningRadius || 4.5;

		deceleration = this.acceleration * 2;

		this.brakePower = brakePower || 5;

		this.speed = 0;

		controlKeys = keys || controlKeys;

		this.wheelRotationAxis = 'x';
		this.wheelTurnAxis = 'z';
		this.steeringWheelTurnAxis = 'y';

		document.addEventListener( 'keydown', this.onKeyDown, false );
		document.addEventListener( 'keyup', this.onKeyUp, false );
	}

	Car.prototype = {
		constructor: Car,
		onKeyUp: function ( event ) {
			switch ( event.keyCode ) {
				case controlKeys.BRAKE: controls.brake = false; break;

				case controlKeys.UP: controls.moveForward = false; break;
				case controlKeys.UP1: controls.moveForward = false; break;

				case controlKeys.DOWN: controls.moveBackward = false; break;
				case controlKeys.DOWN1: controls.moveBackward = false; break;

				case controlKeys.LEFT: controls.moveLeft = false; break;
				case controlKeys.LEFT1: controls.moveLeft = false; break;

				case controlKeys.RIGHT: controls.moveRight = false; break;
				case controlKeys.RIGHT1: controls.moveRight = false; break;
			}
		},
		onKeyDown: function ( event ) {
			switch ( event.keyCode ) {
				case controlKeys.BRAKE:
					controls.brake = true;
					controls.moveForward = false;
					controls.moveBackward = false;
					break;

				case controlKeys.UP: controls.moveForward = true; break;
				case controlKeys.UP1: controls.moveForward = true; break;

				case controlKeys.DOWN: controls.moveBackward = true; break;
				case controlKeys.DOWN1: controls.moveBackward = true; break;

				case controlKeys.LEFT: controls.moveLeft = true; break;
				case controlKeys.LEFT1: controls.moveLeft = true; break;

				case controlKeys.RIGHT: controls.moveRight = true; break;
				case controlKeys.RIGHT1: controls.moveRight = true; break;

			}
		},

	 

		dispose: function () {
			document.removeEventListener( 'keydown', this.onKeyDown, false );
			document.removeEventListener( 'keyup', this.onKeyUp, false );
		},

		update: function ( delta, state ) {
			if ( ! loaded || ! this.enabled ) return;

			var brakingDeceleration = 1;

			if ( controls.brake ) brakingDeceleration = this.brakePower;

			if ( controls.moveForward ) {
				if (this.speed>0.67*this.maxSpeed) {
					this.speed = THREE.Math.clamp( this.speed + delta * (this.acceleration/2), maxSpeedReverse, this.maxSpeed );					
				}
				else{
					this.speed = THREE.Math.clamp( this.speed + delta * this.acceleration, maxSpeedReverse, this.maxSpeed );					
				}
				acceleration = THREE.Math.clamp( acceleration + delta, - 1, 1 );
			}
			
			if ( controls.moveLeft ) {
				wheelOrientation = THREE.Math.clamp( wheelOrientation + delta * steeringWheelSpeed, - maxSteeringRotation, maxSteeringRotation );
			}

			if ( controls.moveBackward ) {
				this.speed = THREE.Math.clamp( this.speed - delta * accelerationReverse, maxSpeedReverse, this.maxSpeed );
				acceleration = THREE.Math.clamp( acceleration - delta, - 1, 1 );
			}

			 

			if ( controls.moveRight ) {
				wheelOrientation = THREE.Math.clamp( wheelOrientation - delta * steeringWheelSpeed, - maxSteeringRotation, maxSteeringRotation );
			}

			// this.speed decay
			if ( ! ( controls.moveForward || controls.moveBackward ) ) {
				if ( this.speed > 0 ) {
					var k = exponentialEaseOut( this.speed / this.maxSpeed );

					this.speed = THREE.Math.clamp( this.speed - k * delta * deceleration * brakingDeceleration, 0, this.maxSpeed );
					acceleration = THREE.Math.clamp( acceleration - k * delta, 0, 1 );
				} else {
					var k = exponentialEaseOut( this.speed / maxSpeedReverse );

					this.speed = THREE.Math.clamp( this.speed + k * delta * accelerationReverse * brakingDeceleration, maxSpeedReverse, 0 );
					acceleration = THREE.Math.clamp( acceleration + k * delta, - 1, 0 );
				}
			}

			// steering decay
			if ( ! ( controls.moveLeft || controls.moveRight ) ) {
				if ( wheelOrientation > 0 ) {
					wheelOrientation = THREE.Math.clamp( wheelOrientation - delta * steeringWheelSpeed*1.5, 0, maxSteeringRotation );
				} else {
					wheelOrientation = THREE.Math.clamp( wheelOrientation + delta * steeringWheelSpeed*1.5, - maxSteeringRotation, 0 );
				}
			}

			var forwardDelta = - this.speed * delta;

			carOrientation -= ( forwardDelta * this.turningRadius * 0.02 ) * wheelOrientation;

			root.position.x += Math.sin( carOrientation ) * forwardDelta * length;
			root.position.z += Math.cos( carOrientation ) * forwardDelta * length;

			// angle of car
			if (state==0) {
				carOrientation=-Math.PI/2;
				root.rotation.y = carOrientation;
			}
			else{
				root.rotation.y = carOrientation;
			}

			// wheels rolling
			var angularSpeedRatio = - 2 / wheelDiameter;

			var wheelDelta = forwardDelta * angularSpeedRatio * length;

			frontLeftWheel.rotation[ this.wheelRotationAxis ] -= wheelDelta;
			frontRightWheel.rotation[ this.wheelRotationAxis ] -= wheelDelta;
			backLeftWheel.rotation[ this.wheelRotationAxis ] -= wheelDelta;
			backRightWheel.rotation[ this.wheelRotationAxis ] -= wheelDelta;

			// rotation while steering
			frontLeftWheelRoot.rotation[ this.wheelTurnAxis ] = wheelOrientation;
			frontRightWheelRoot.rotation[ this.wheelTurnAxis ] = wheelOrientation;

			steeringWheel.rotation[ this.steeringWheelTurnAxis ] = -wheelOrientation * 6;
		},

		setModel: function ( model, elemNames ) {
			if ( elemNames ) this.elemNames = elemNames;

			root = model;

			this.setupWheels();
			this.computeDimensions();

			loaded = true;
		},

		setupWheels: function () {
			frontLeftWheelRoot = root.getObjectByName( this.elemNames.flWheel );
			frontRightWheelRoot = root.getObjectByName( this.elemNames.frWheel );
			backLeftWheel = root.getObjectByName( this.elemNames.rlWheel );
			backRightWheel = root.getObjectByName( this.elemNames.rrWheel );

			if ( this.elemNames.steeringWheel !== null ) steeringWheel = root.getObjectByName( this.elemNames.steeringWheel );

			while ( frontLeftWheelRoot.children.length > 0 ) frontLeftWheel.add( frontLeftWheelRoot.children[ 0 ] );
			while ( frontRightWheelRoot.children.length > 0 ) frontRightWheel.add( frontRightWheelRoot.children[ 0 ] );

			frontLeftWheelRoot.add( frontLeftWheel );
			frontRightWheelRoot.add( frontRightWheel );
		},

		computeDimensions: function () {
			var bb = new THREE.Box3().setFromObject( frontLeftWheelRoot );

			var size = new THREE.Vector3();
			bb.getSize( size );

			wheelDiameter = Math.max( size.x, size.y, size.z );

			bb.setFromObject( root );

			size = bb.getSize( size );
			length = Math.max( size.x, size.y, size.z );
		},

		

	};

	
	
	function exponentialEaseOut( k ) {
		return k === 1 ? 1 : - Math.pow( 2, - 10 * k ) + 1;
	}

	return Car;

} )();
