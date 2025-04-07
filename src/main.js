const canvas = document.createElement("canvas");

const gl = canvas.getContext("webgl2", { antialias: true, depth : false });

const oestexturefloatlinear     = gl.getExtension("OES_texture_float_linear");
const colorbufferfloat          = gl.getExtension("EXT_color_buffer_float");
const floatblend                = gl.getExtension("EXT_float_blend");
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

const WRAPS = {
	CLAMP_TO_EDGE   : gl.CLAMP_TO_EDGE,
	REPEAT          : gl.REPEAT,
	MIRRORED_REPEAT : gl.MIRRORED_REPEAT
};

exports.WRAPS = WRAPS;


const FILTERS = {
	LINEAR  : gl.LINEAR,
	NEAREST : gl.NEAREST
};
exports.FILTERS = FILTERS;

const BUFFER_TYPES = {
	UNSIGNED_BYTE          : gl.UNSIGNED_BYTE,
	HALF_FLOAT             : gl.HALF_FLOAT,
	FLOAT                  : gl.FLOAT
}
exports.BUFFER_TYPES = BUFFER_TYPES;

const FORMATS = {
	RED  : gl.RED,
	RG   : gl.RG,
	RGB  : gl.RGB,
	RGBA : gl.RGBA
};
exports.FORMATS = FORMATS;

const internalFormats = {};
internalFormats[BUFFER_TYPES.UNSIGNED_BYTE] = {};
internalFormats[BUFFER_TYPES.UNSIGNED_BYTE][FORMATS.RED] = gl.R8;
internalFormats[BUFFER_TYPES.UNSIGNED_BYTE][FORMATS.RG]  = gl.RG8;
internalFormats[BUFFER_TYPES.UNSIGNED_BYTE][FORMATS.RGB] = gl.RGB8;
internalFormats[BUFFER_TYPES.UNSIGNED_BYTE][FORMATS.RGBA]= gl.RGBA8;

internalFormats[BUFFER_TYPES.HALF_FLOAT] = {};
internalFormats[BUFFER_TYPES.HALF_FLOAT][FORMATS.RED] = gl.R16F;
internalFormats[BUFFER_TYPES.HALF_FLOAT][FORMATS.RG]  = gl.RG16F;
internalFormats[BUFFER_TYPES.HALF_FLOAT][FORMATS.RGB] = gl.RGB16F;
internalFormats[BUFFER_TYPES.HALF_FLOAT][FORMATS.RGBA]= gl.RGBA16F;

internalFormats[BUFFER_TYPES.FLOAT] = {};
internalFormats[BUFFER_TYPES.FLOAT][FORMATS.RED] = gl.R32F;
internalFormats[BUFFER_TYPES.FLOAT][FORMATS.RG]  = gl.RG32F;
internalFormats[BUFFER_TYPES.FLOAT][FORMATS.RGB] = gl.RGB32F;
internalFormats[BUFFER_TYPES.FLOAT][FORMATS.RGBA]= gl.RGBA32F;

const UNIFORMS_TYPES = {
	BOOL       : gl.BOOL,
	FLOAT      : gl.FLOAT,
	INT        : gl.INT,
	FLOAT_VEC2 : gl.FLOAT_VEC2,
	FLOAT_VEC3 : gl.FLOAT_VEC3,
	FLOAT_VEC4 : gl.FLOAT_VEC4,
	FLOAT_MAT2 : gl.FLOAT_MAT2,
	FLOAT_MAT3 : gl.FLOAT_MAT3,
	FLOAT_MAT4 : gl.FLOAT_MAT4,
	SAMPLER_2D : gl.SAMPLER_2D
};
exports.UNIFORMS_TYPES = UNIFORMS_TYPES;

function RenderingBuffer(settings) {
	this.settings = Object.assign({
		width  : 256,
		height : 256,
		format : FORMATS.RGBA,
		type   : BUFFER_TYPES.FLOAT,
		wrap   : { s : WRAPS.CLAMP_TO_EDGE, t : WRAPS.CLAMP_TO_EDGE },
		filter : { mag : FILTERS.LINEAR, min : FILTERS.LINEAR},
	},settings);
	Object.defineProperty(this, "buffer", {
		value : gl.createTexture(),
		writable: false,
		enurabble: false
	})
	gl.bindTexture(gl.TEXTURE_2D, this.buffer);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, this.settings.wrap.s);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,  this.settings.wrap.t);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.settings.filter.mag);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.settings.filter.min);
	gl.texImage2D(gl.TEXTURE_2D, 0, internalFormats[this.settings.type][this.settings.format], this.settings.width, this.settings.height, 0, this.settings.format, this.settings.type, null);
}

RenderingBuffer.prototype.setData = function (data) {
	gl.bindTexture(gl.TEXTURE_2D, this.buffer);
	gl.texImage2D(gl.TEXTURE_2D, 0, internalFormats[this.settings.type][this.settings.format], this.settings.width, this.settings.height, 0, this.settings.format, this.settings.type, data);

}

RenderingBuffer.prototype.release = function () {
	gl.deleteTexture(this.buffer);
}

RenderingBuffer.FromImage = function(image) {

	let buffer = new RenderingBuffer({ width: image.width, height: image.height});
	buffer.setData(image);
	return buffer;
}

exports.RenderingBuffer = RenderingBuffer;


function RenderingTarget() {
	let argTarget, argSetting;
	for (const param of arguments) {
		if (param instanceof HTMLCanvasElement || param instanceof RenderingBuffer) {
			argTarget = param
		} else if(typeof param === 'object' && !Array.isArray(param) && param !== null) {
			argSetting = param;
		}
	}
	this.settings = Object.assign({
		autoWires : {
			resolution : true
		}
	},argSetting);


	let _target =null;

	Object.defineProperties(this,{
		target : {
			get : function () {
				return _target;
			},
			set : function(target) {
				if(target !== _target) {
					this.release();
				}
				if(target instanceof HTMLCanvasElement) {
					let context2D = target.getContext("2d");
					Object.defineProperty(this, "render", {
						writable: false,
						enurabble: false,
						configurable : true,
						value : function (program) {
							if(this.settings.autoWires.resolution && program.uniforms.resolution?.type == UNIFORMS_TYPES.FLOAT_VEC2) {
								program.uniforms.resolution.value = [_target.width, _target.height];
							}
							context2D.drawImage(program.render({width : _target.width, height: _target.height}), 0, 0, _target.width, _target.height);
						}
					});
					Object.defineProperty(this, "release", {
						writable: true,
						enurabble: true,
						configurable : true,
						value : function () {}
					});
				} else if (target instanceof RenderingBuffer) {
					let depthBuffer = gl.createRenderbuffer();
					gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
					gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_STENCIL, target.settings.width, target.settings.height);
					let frameBuffer = gl.createFramebuffer();
					gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
					gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.buffer, 0);
					gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
					Object.defineProperty(this, "render", {
						writable: false,
						enurabble: false,
						configurable : true,
						value : function (program) {
							if(this.settings.autoWires.resolution && program.uniforms.resolution?.type == UNIFORMS_TYPES.FLOAT_VEC2) {
								program.uniforms.resolution.value =[ _target.settings.width, _target.settings.height];
							}
							program.render({width : _target.settings.width, height: _target.settings.height, frameBuffer});
						}
					});
					Object.defineProperty(this, "release", {
						writable: true,
						enurabble: true,
						configurable : true,
						value : function () {
							gl.deleteRenderbuffer(depthBuffer);
							gl.deleteFramebuffer(frameBuffer);
						}
					});
				}
				_target = target;
			}
		}
	});

	if(argTarget) {
		this.target = argTarget;
	}
}

RenderingTarget.prototype.release = function() {
	//this can be override by set target
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
								type :  { value : UNIFORMS_TYPES.BOOL, enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value :  { value: false, enumerable : true, writable: true }

							});
							break;

						case gl.INT :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : UNIFORMS_TYPES.INT, enumerable : true },
								location :   { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: 0, enumerable : true, writable: true }
							});
							break;

						case gl.FLOAT :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : UNIFORMS_TYPES.FLOAT, enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: 0, enumerable : true, writable: true }
							});
							break;

						case gl.FLOAT_VEC4 :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : UNIFORMS_TYPES.FLOAT_VEC4, enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: [0, 0, 0, 0], enumerable : true, writable: true }

							});
							break;

						case gl.FLOAT_VEC3 :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : UNIFORMS_TYPES.FLOAT_VEC3, enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: [0, 0, 0], enumerable : true, writable: true }
							});
							break;

						case gl.FLOAT_VEC2 :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : UNIFORMS_TYPES.FLOAT_VEC2, enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: [0, 0], enumerable : true, writable: true }
							});
							break;

						case gl.FLOAT_MAT4 :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : UNIFORMS_TYPES.FLOAT_MAT4, enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: new Float32Array(16), enumerable : true, writable: true }
							});
							break;


						case gl.FLOAT_MAT3:
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : UNIFORMS_TYPES.FLOAT_MAT3, enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: new Float32Array(9), enumerable : true, writable: true }
							});
							break;


						case gl.FLOAT_MAT2 :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : UNIFORMS_TYPES.FLOAT_MAT2, enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: new Float32Array(4), enumerable : true, writable: true }
							});
							break;

						case gl.SAMPLER_2D :
							this.uniforms[info.name] = Object.create(Object.prototype,
							{
								type :  { value : UNIFORMS_TYPES.SAMPLER_2D, enumerable : true },
								location : { value : gl.getUniformLocation(this.shaderProgram, info.name), enumerable : true },
								value : { value: null, enumerable : true, writable: true }
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
					return target.render(this);
				}
				var renderSettting = Object.assign({
					width : 640,
					height : 480,
					frameBuffer : null
				},target);
				canvas.width = renderSettting.width;
				canvas.height = renderSettting.height;
				gl.bindFramebuffer(gl.FRAMEBUFFER, renderSettting.frameBuffer);
				gl.viewport(0, 0, renderSettting.width, renderSettting.height);
				gl.scissor(0, 0, renderSettting.width, renderSettting.height);
				gl.clearColor.apply(gl, _clearColor);
				gl.clear(gl.COLOR_BUFFER_BIT);

				for (var i = 0; i < maxVertexAttribs; ++i) {
					gl.disableVertexAttribArray(i);
				}
				gl.useProgram(this.shaderProgram);
				let textIndex = 0;
				for(const uniform of Object.values(this.uniforms)) {
					switch(uniform.type) {
						case UNIFORMS_TYPES.BOOL :
							gl.uniform1i(uniform.location, uniform.value? 1 : 0);
							break;

						case UNIFORMS_TYPES.INT:
							gl.uniform1i(uniform.location, uniform.value);
							break;

						case UNIFORMS_TYPES.FLOAT:
							gl.uniform1f(uniform.location, uniform.value);
							break;

						case UNIFORMS_TYPES.FLOAT_VEC4:
							gl.uniform4fv(uniform.location, uniform.value);
							break;

						case UNIFORMS_TYPES.FLOAT_VEC3:
							gl.uniform3fv(uniform.location, uniform.value);
							break;

						case UNIFORMS_TYPES.FLOAT_VEC2:
							gl.uniform2fv(uniform.location, uniform.value);
							break;

						case UNIFORMS_TYPES.FLOAT_MAT4:
							gl.uniformMatrix4fv(uniform.location, false, uniform.value);
							break;

						case UNIFORMS_TYPES.FLOAT_MAT3:
							gl.uniformMatrix3fv(uniform.location, false, uniform.value);
							break;

						case UNIFORMS_TYPES.FLOAT_MAT2:
							gl.uniformMatrix2fv(uniform.location, false, uniform.value);
							break;

						case UNIFORMS_TYPES.SAMPLER_2D:
							if (uniform.value instanceof RenderingBuffer) {
								gl.uniform1i(uniform.location, textIndex);
								gl.activeTexture(gl.TEXTURE0 + textIndex);
								gl.bindTexture(gl.TEXTURE_2D, uniform.value.buffer);
								textIndex+=1;
							}
							break;
					}
				}

				gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

				// console.log("error :", gl.getError());

				return canvas;

			}
		},

		release : {
			value : function () {
				if (pixelShader) {
					gl.detachShader(this.shaderProgram,pixelShader);
					gl.deleteShader(pixelShader);
				}

				gl.detachShader(this.shaderProgram,vertexShader);
				gl.deleteShader(vertexShader);
				gl.deleteProgram(shaderProgram);

			}
		}

	});

	if(this.settings.source) {
		this.source = this.settings.source;
	}


}

exports.RenderingProgram = RenderingProgram;