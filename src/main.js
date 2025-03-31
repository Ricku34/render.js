const canvas = document.createElement("canvas");

const gl = canvas.getContext("webgl2", { antialias: true, depth : false });
const vertexSource = require('./vertex.glsl');
const fragmentSource = require('./fragment.glsl');


console.assert(gl,"Web brwowser doesn't support webgl");

gl.disable( gl.CULL_FACE );
gl.enable( gl.BLEND );
gl.disable(gl.STENCIL_TEST);
gl.blendEquation( gl.FUNC_ADD );
gl.blendFunc( gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA );
gl.pixelStorei(gl.PACK_ALIGNMENT,                     1);
gl.pixelStorei(gl.UNPACK_ALIGNMENT,                   1);
gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,                true);
gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,     false);
gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);

const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);

function RenderingTarget(settings) {
	this.settings = Object.assign({
		autoWires : {
			resolution : true,
			time : true
		}
	},settings);
	console.assert(this.settings.target instanceof HTMLCanvasElement);
	this.context2D = this.settings.target.getContext("2d");


	Object.defineProperties(this,{
		run : {
			writable: false,
			enurabble: true,
			value : function (program) {
				if(this.settings.autoWires.resolution && program.uniforms.resolution?.type == "vec2") {
					program.uniforms.resolution.value = [this.settings.target.width, this.settings.target.height];
				}
				this.context2D.drawImage(program.render({width : this.settings.target.width, height: this.settings.target.height}), 0, 0, this.settings.target.width, this.settings.target.height);
			}
		}
	});

}

exports.RenderingTarget = RenderingTarget;

function RenderingProgram(settings) {

	var _clearColor = [0,0,0,0];
	this.settings = Object.assign({
		clearColor : _clearColor
	},settings);

	const shaderProgram = gl.createProgram();
	const vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, vertexSource);
	gl.compileShader(vertexShader);
	gl.attachShader(shaderProgram, vertexShader);
	// if(!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
	// 	throw new Error("An error occurred compiling the vertexShader: " + gl.getShaderInfoLog(vertexShader));
	// }
	var pixelShader = null;

	Object.defineProperties(this,{
		/**
		 * private properties
		 */
		shaderProgram  : {
			value : shaderProgram,
			writable: false,
			enurabble: false
		},
		vertexShader: {
			value : vertexShader,
			writable: false,
			enurabble: false
		},
		/**
		 * public properties
		 */
		source : {
			get : function () {
				return this.settings.source;
			},
			set : function(src) {
				if (pixelShader) {
					gl.detachShader(this.shaderProgram,pixelShader);
					gl.deleteShader(pixelShader);
				}
				pixelShader = gl.createShader(gl.FRAGMENT_SHADER);
				gl.shaderSource(pixelShader,fragmentSource + src );
				gl.compileShader(pixelShader);
				if(!gl.getShaderParameter(pixelShader, gl.COMPILE_STATUS)) {
					throw new Error("An error occurred compiling the PixelShaders: " + gl.getShaderInfoLog(pixelShader));
				}
				gl.attachShader(this.shaderProgram, pixelShader);
				gl.linkProgram(this.shaderProgram);
				this.settings.source = src;
				this.uniforms = {};
				const numUniforms = gl.getProgramParameter(this.shaderProgram, gl.ACTIVE_UNIFORMS);
				for (let i = 0; i < numUniforms; ++i) {
					const info = gl.getActiveUniform(this.shaderProgram, i);
					switch(info.type) {
						case gl.BOOL :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : "bool", enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value :  { value: false, enumerable : true, writable: true }

							});
							break;

						case gl.INT :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : "int", enumerable : true },
								location :   { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: 0, enumerable : true, writable: true }
							});
							break;

						case gl.FLOAT :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : "float", enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: 0, enumerable : true, writable: true }
							});
							break;

						case gl.FLOAT_VEC4 :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : "vec4", enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: [0, 0, 0, 0], enumerable : true, writable: true }

							});
							break;

						case gl.FLOAT_VEC3 :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : "vec3", enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: [0, 0, 0], enumerable : true, writable: true }
							});
							break;

						case gl.FLOAT_VEC2 :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : "vec2", enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: [0, 0], enumerable : true, writable: true }
							});
							break;

						case gl.FLOAT_MAT4 :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : "mat4", enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: new Float32Array(16), enumerable : true, writable: true }
							});
							break;


						case gl.FLOAT_MAT3:
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : "mat3", enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: new Float32Array(9), enumerable : true, writable: true }
							});
							break;


						case gl.FLOAT_MAT2 :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : "mat2", enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: new Float32Array(4), enumerable : true, writable: true }
							});
							break;

					}
				}

			}
		},
		clearColor : {
			get : function () {
				return this.settings.clearColor;
			},
			set : function(color) {
				this.settings.clearColor = color;
				_clearColor = color;
			}
		},
		render : {
			writable: false,
			enurabble: true,
			value : function (target) {

				if (target instanceof RenderingTarget) {
					return target.run(this);
				}
				var renderSettting = Object.assign({
					width : 640,
					height : 480
				},target);
				canvas.width = renderSettting.width;
				canvas.height = renderSettting.height;
				gl.bindFramebuffer(gl.FRAMEBUFFER, null);
				gl.viewport(0, 0, renderSettting.width, renderSettting.height);
				gl.scissor(0, 0, renderSettting.width, renderSettting.height);
				gl.clearColor.apply(gl, _clearColor);
				gl.clear(gl.COLOR_BUFFER_BIT);

				for (var i = 0; i < maxVertexAttribs; ++i) {
					gl.disableVertexAttribArray(i);
				}
				gl.useProgram(this.shaderProgram);

				for(const uniform of Object.values(this.uniforms)) {
					switch(uniform.type) {
						case "bool" :
							gl.uniform1i(uniform.location, uniform.value? 1 : 0);
							break;

						case "int":
							gl.uniform1i(uniform.location, uniform.value);
							break;

						case "float":
							gl.uniform1f(uniform.location, uniform.value);
							break;

						case "vec4":
							gl.uniform4fv(uniform.location, uniform.value);
							break;

						case "vec3":
							gl.uniform3fv(uniform.location, uniform.value);
							break;

						case "vec2":
							gl.uniform2fv(uniform.location, uniform.value);
							break;

						case "mat4":
							gl.uniformMatrix4fv(uniform.location, false, uniform.value);
							break;

						case "mat3":
							gl.uniformMatrix3fv(uniform.location, false, uniform.value);
							break;

						case "mat2":
							gl.uniformMatrix2fv(uniform.location, false, uniform.value);
							break;
					}
				}

				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

				return canvas;

			}
		}

	});



}

exports.RenderingProgram = RenderingProgram;