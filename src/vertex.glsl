#version 300 es

void main(void) {
	vec2 vertex[4];
	vertex[0] = vec2(-1.0, -1.0);
	vertex[1] = vec2(-1.0,  1.0);
	vertex[2] = vec2( 1.0, -1.0);
	vertex[3] = vec2( 1.0,  1.0);
	gl_Position.xy = vertex[gl_VertexID];
	gl_Position.z = 0.0;
	gl_Position.w = 1.0;
}