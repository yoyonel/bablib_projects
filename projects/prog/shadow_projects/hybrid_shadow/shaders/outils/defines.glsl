#define GET_VERTEX_V3(i)    (gl_PositionIn[i].xyz)
#define GET_NORMAL(i)       (v3_normal[i])
#define GET_WEIGHT(i)       (f_weights[i])
#define GET_LIGHT_POSITION  (u_v3_light_pos_in_object)
#define GET_LIGHTING(i)     (f_coefs_lighting[i])
//
#define COMPUTE_LIGHTING_0( v3_vertex, v3_normal, v3_light_pos ) 	dot(normalize(v3_light_pos - v3_vertex), normalize(v3_normal));
//#define COMPUTE_LIGHTING_0(v3_vertex, v3_normal, v3_light_pos)          dot(v3_light_pos - v3_vertex, v3_normal);
//
#define COMPUTE_LIGHTING(i, v3_light_pos) 				COMPUTE_LIGHTING_0(GET_VERTEX_V3(i), GET_NORMAL(i), v3_light_pos)
//
#define COMPUTE_WEIGHT_0(f_coef_lighting, f_coef_seuil_iso)             abs(f_coef_lighting - f_coef_seuil_iso)
#define COMPUTE_WEIGHT(i, f_coef_seuil_iso)                             COMPUTE_WEIGHT_0(GET_LIGHTING(i), f_coef_seuil_iso);
//
#define COMPUTE_VERTEX_EDGE_1( v0, v1, w0, w1 ) 	mix( v0, v1, w0 / (w0 + w1) )
//#define COMPUTE_VERTEX_EDGE_1( v0, v1, w0, w1 ) 	((w1*(v0) + w0*(v1)) / (w0 + w1))
#define COMPUTE_VERTEX_EDGE( i0, i1 ) 			COMPUTE_VERTEX_EDGE_1( GET_VERTEX_V3(i0), GET_VERTEX_V3(i1), GET_WEIGHT(i0), GET_WEIGHT(i1))
#define COMPUTE_VERTEX0_EDGE( i0, i1 ) 			v3_edge[0] = COMPUTE_VERTEX_EDGE( i0, i1 );
#define COMPUTE_VERTEX1_EDGE( i0, i1 ) 			v3_edge[1] = COMPUTE_VERTEX_EDGE( i0, i1 );
//
#define COMPUTE_VERTEX_EXTRUSION( vertex, light_pos, coef_extrusion )	(vertex - coef_extrusion*normalize( light_pos - vertex ))
#define	COMPUTE_VERTEX0_EXTRUSION					v3_proj_edge[0] = COMPUTE_VERTEX_EXTRUSION( v3_edge[0], GET_LIGHT_POSITION, u_f_coef_extrusion );
#define	COMPUTE_VERTEX1_EXTRUSION					v3_proj_edge[1] = COMPUTE_VERTEX_EXTRUSION( v3_edge[1], GET_LIGHT_POSITION, u_f_coef_extrusion );
#define COMPUTE_EXTRUSION( vertex )                                     COMPUTE_VERTEX_EXTRUSION( vertex, GET_LIGHT_POSITION, u_f_coef_extrusion )
//
#define EMIT_VERTEX_V3(v3_vertex)                                               \
            gl_Position = gl_ModelViewProjectionMatrix * vec4(v3_vertex, 1);    \
            EmitVertex();
#define EMIT_VERTEX_V4(v4_vertex)                                               \
            gl_Position = gl_ModelViewProjectionMatrix * v4_vertex;             \
            EmitVertex();
