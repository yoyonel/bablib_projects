#ifndef __HELPER_VIEWER_UPDATE__
#define __HELPER_VIEWER_UPDATE__

#include <Vec3.h>
#include <Params.h>
//
#include "helper_accum_frustum.h"

#include <gsl/gsl_qrng.h>

gsl_qrng * q = gsl_qrng_alloc (gsl_qrng_sobol, 4);
//gsl_qrng * q = gsl_qrng_alloc (gsl_qrng_halton, 4);
double v[4];

HaltonSequence hs;
int index_hs = 0;
int base_hs = 2;
	        
void Viewer::updateFrameBuffers()
{
	// Alternance Read/Write sur les buffers History (une sorte de PingPong Buffers)
	eCurrentFrame = (eCurrentFrame == eRead) ? eWrite : eRead; 
	const int ePrevFrame = (eCurrentFrame == eRead) ? eWrite : eRead;

	// MAJ des cameras
	qgl_cam_eyes[eCurrentFrame] 	= *camera();

	// MAJ: Jittering sur la camera light
	qgl_cam_light_rand = qgl_cam_light;

	if ( PARAM(bool, light.jittered) && PARAM(bool, light.jittered.rotation)) {				
		// On génère une nouvelle suite de nombres (pseudo)-aléatoires (séquence d'Halton)
		gsl_qrng_get (q, v);

		// - Version avec rotation aléatoire (halton séquence générée par gsl)
		const Vec2	v_angles_rand = Vec2(v[0], v[1]) * PARAM(double, light.jittered.max_angle);

		qglviewer::Vec	v_up = qglviewer::Vec( cosf(v_angles_rand.x) , sinf(v_angles_rand.y) , 0. );

		// TODO: fix this !
		//const qglviewer::ManipulatedCameraFrame * manip_cam_frame = qgl_cam_light_rand.frame();
		//v_up = manip_cam_frame->inverseTransformOf( v_up );
		v_up = qgl_cam_light_rand.frame()->inverseTransformOf( v_up );

		qgl_cam_light_rand.setUpVector( v_up );
	}
	
	//
	tex_shadow_clipmap_current 	= tex_shadow_clipmap[ePrevFrame];
	//
	tex_history_visibility 		= tex_shadow_clipmap[eCurrentFrame];
	tex_history_positions		= tex_positions_ws[eCurrentFrame];
	//
	index_hs ++;


	// - FRAME_BUFFERS: Maj des FBs et Render-Textures associées
	//tq_update_shadow_map.begin();
	// - update depth shadow map texture (light view)
	updateShadowMap( fb_depth_shadow_map, qgl_cam_light_rand );
	//tq_update_shadow_map.end();
	
	//tq_update_shadow_clip_map.begin();
	// - update shadow clip map (eyes view)
	updateShadowClipMap( 
		fb_shadow_clipmap[ePrevFrame],
		tex_shadow_map, 
		qgl_cam_light_rand, 		// light camera
		qgl_cam_eyes		 	// eyes camera
	);
	//tq_update_shadow_clip_map.end();


	// - TIMER_QUERY
	/*
	tq_update_shadow_map.update();
	tq_update_shadow_clip_map.update();
	//
	if ( PARAM(bool, timer_query.print) ) {
		GLdouble dTimeElapsed_USM = tq_update_shadow_map.getTimeElapsed() / 1.e6;
		GLdouble dTimeElapsed_USCM = tq_update_shadow_clip_map.getTimeElapsed() / 1.e6;
		fprintf(stdout, "# Timer_Query Update Shadow Map - Update Shadow ClipMap: %2.4lfms - %2.4lfms\r", dTimeElapsed_USM, dTimeElapsed_USCM ); // affiche en millisecondes
	}
	*/
}

void Viewer::updateShadowMap(
	FrameBuffer& _framebuffer,
	const qglviewer::Camera& _qgl_cam_light
	)
{
	
	_framebuffer.activate();
	
		glPushAttrib( GL_ALL_ATTRIB_BITS );	
		
		glViewport(0, 0, _framebuffer.width(), _framebuffer.height());
		
		setOpenGLStates();
	
		glColorMask(0x0, 0x0, 0x0, 0x0);
		glClear(GL_DEPTH_BUFFER_BIT);

		// Set light's camera (OpenGL 1.x style)
		// Sauvegarde des matrices de transformations
		glMatrixMode(GL_PROJECTION);
		glPushMatrix();
		glMatrixMode(GL_MODELVIEW);
		glPushMatrix();
	
		_qgl_cam_light.loadProjectionMatrix();
		_qgl_cam_light.loadModelViewMatrix();
		
		if (PARAM(bool, light.jittered)) {
			static unsigned int jitter = 0;
			jitter = (jitter+1)%16;

			if (PARAM(bool, light.jittered.translation)) {				
				glMatrixMode(GL_PROJECTION);
				glPushMatrix();		
					const double 	f_jittered_scale_x(PARAM(double, light.jittered.scale_x)),
							f_jittered_scale_y(PARAM(double, light.jittered.scale_y));
					const double 	jitter_x = v[2]	* f_jittered_scale_x,
							jitter_y = v[3]	* f_jittered_scale_y;

					accPerspective(
						_qgl_cam_light.fieldOfView(),
						_qgl_cam_light.aspectRatio(),
						_qgl_cam_light.zNear(), _qgl_cam_light.zFar(),
						jitter_x, jitter_y,
						0., 0.,
						1.
						);
					ProjTransfo pt_jitter_translation = ProjTransfo::getGLProjection();
				glMatrixMode(GL_PROJECTION);
				glPopMatrix();

				pt_jitter_translation.glLoadProjection();
				glMatrixMode(GL_MODELVIEW);
			}
		}
		// -- Render front or back face
		glEnable(GL_CULL_FACE);
		if (PARAM(bool, shadow.use_back_face)) {
			glCullFace(GL_FRONT);
		}
		else {
			glCullFace(GL_BACK);
		}
		
		// Draw scene occluders

		// MODEL_SPACE -> WORLD_SPACE
		const ProjTransfo pt_mv_world_spiral; // matrix identity
		prog_vbo_dsm.activate();
			prog_vbo_dsm.setUniformMat4( "u_m4_object_world", pt_mv_world_spiral.coefs(), false);
			drawSpiral();
		prog_vbo_dsm.deactivate();
		
		// MODEL_SPACE -> WORLD_SPACE
		const ProjTransfo pt_mv_world_vbo = 
				ProjTransfo::scaling(Vec3(f_scale_vbo)) *
				ProjTransfo(qgl_mf_vbo.worldMatrix());
		glPushMatrix();
			//glScalef( f_scale_vbo, f_scale_vbo, f_scale_vbo );
			//glMultMatrixd(qgl_mf_vbo.worldMatrix());
			pt_mv_world_vbo.glMultModelView();
			vbo->setProg( prog_vbo_dsm );
			prog_vbo_dsm.activate();
				prog_vbo_dsm.setUniformMat4( "u_m4_object_world", pt_mv_world_vbo.coefs(), false);
				vbo->render(GL_TRIANGLES, indexBuffer);
			prog_vbo_dsm.deactivate();
		glPopMatrix();
		
		// Restore the OpenGL Matrix
		glMatrixMode(GL_PROJECTION);
		glPopMatrix();
		glMatrixMode(GL_MODELVIEW);
		glPopMatrix();
		//
	
		glPopAttrib();	
	
	_framebuffer.deactivate();
}

void Viewer::updateShadowClipMap(
		FrameBuffer& 		_framebuffer,
		Texture& 		_tex_shadow_map,
	const 	qglviewer::Camera&	_qgl_cam_light,
	const 	qglviewer::Camera	_qgl_cam_eyes[eSize]
	)
{
	_framebuffer.activate();

		// set camera eyes
		_qgl_cam_eyes[eCurrentFrame].loadProjectionMatrix();
		_qgl_cam_eyes[eCurrentFrame].loadModelViewMatrix();	

		glPushAttrib( GL_VIEWPORT_BIT );	
		_framebuffer.viewport().setGL();

		/**/

		setOpenGLStates();
		glColorMask(~0x0, ~0x0, ~0x0, ~0x0);
		
		glClearColor(0, 0, 0.5, 0);

		glClear( GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);	
		//glClear(GL_DEPTH_BUFFER_BIT);

		// -- récupération des dimensions des textures
		const Vec2 v2_sm_size( _tex_shadow_map.getWidth(), _tex_shadow_map.getHeight() );

		//
		ProjTransfo pt_cam_light(_qgl_cam_light);	// WORLD -> LIGHT_SPACE_TEXTURE

		if (PARAM(bool, light.jittered)) {
			static unsigned int jitter = 0;
			jitter = (jitter+1)%16;

			if (PARAM(bool, light.jittered.translation)) {
				//const float f_radius = PARAM(float, light.radius);
				//qgl_cam_light_rand.setPosition( qgl_cam_light.position() + qglviewer::Vec(Vec3::random(-1.f, +1.f) * f_radius ) );
				
				glMatrixMode(GL_PROJECTION);
				glPushMatrix();					
					const double 	f_jittered_scale_x(PARAM(double, light.jittered.scale_x)),
							f_jittered_scale_y(PARAM(double, light.jittered.scale_y));
					//
					const double 	jitter_x = v[2]	* f_jittered_scale_x,
							jitter_y = v[3]	* f_jittered_scale_y;

					accPerspective(
						_qgl_cam_light.fieldOfView(),
						_qgl_cam_light.aspectRatio(),
						_qgl_cam_light.zNear(), _qgl_cam_light.zFar(),
						jitter_x, jitter_y,
						0., 0.,
						1.
						);
					pt_cam_light = ProjTransfo::getGLProjection() * ProjTransfo::getModelView(_qgl_cam_light);
				glMatrixMode(GL_PROJECTION);
				glPopMatrix();

				glMatrixMode(GL_MODELVIEW);
			}
		}
		ProjTransfo pt_world_light;
		if (PARAM(bool, shadow.use_shadow_proj) ) {
			const ProjTransfo pj_bias = ProjTransfo::scalingAndTranslation(Vec3(0.5f), Vec3(0.5f));
			pt_world_light = pj_bias * pt_cam_light;
		}
		else {
			pt_world_light = pt_cam_light;
		}

		//
		if (PARAM(bool, shadow.use_polygon_offset)) {
			//
			const float fScale 	= PARAM(float, shadow.polygon_offset.scale);
			const float fBias 	= PARAM(float, shadow.polygon_offset.bias);
			glEnable( GL_POLYGON_OFFSET_FILL );
			glPolygonOffset( fScale, fBias);
		}

		// -- active le mode de comparaison des profondeurs
		_tex_shadow_map.bind();	
		glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_COMPARE_MODE, GL_COMPARE_R_TO_TEXTURE);

		prog_vbo_scm.activate();
		prog_vbo_scm.activateTextures();
		MSG_CHECK_GL;

		// DRAW THE SCENE
		{
			ProjTransfo pt_cam_eyes_prev(_qgl_cam_eyes[INVERT_RW(eCurrentFrame)]);
			prog_vbo_scm.setUniformMat4( "u_m4_mvp_prev", pt_cam_eyes_prev.coefs(), false);

			const Vec4 v4_world_light_pos = Vec4( Vec3(qgl_cam_light.position()) );
		
			prog_vbo_scm.setUniformVec2( "v2_sm_size", v2_sm_size, false );

			if (PARAM(bool, shadow.use_constant_depth_bias)) {
				float coef_depth_bias = PARAM(float, shadow.constant_depth_bias);
				prog_vbo_scm.setUniform( "coef_depth_bias", coef_depth_bias, false );
			}

			{
				// MODEL_SPACE -> WORLD_SPACE
				const ProjTransfo pt_mv_world_vbo = 
						ProjTransfo::scaling(Vec3(f_scale_vbo)) *
						ProjTransfo(qgl_mf_vbo.worldMatrix());
				prog_vbo_scm.setUniformMat4( "u_m4_modelview", pt_mv_world_vbo.coefs(), false);

				// MODEL_SPACE -> WORLD_SPACE -> LIGHT_SPACE_TEXTURE
				const ProjTransfo pt_mv_light = pt_world_light * pt_mv_world_vbo;
				prog_vbo_scm.setUniformMat4( "u_m4_mv_light", pt_mv_light.coefs(), false);

				const ProjTransfo pt_world_mv_vbo = pt_mv_world_vbo.inv();
				const Vec4 v4_mv_light_pos = pt_mv_world_vbo.inv() * v4_world_light_pos;
				prog_vbo_scm.setUniformVec4( "u_v4_mv_light_pos", v4_mv_light_pos, false);
						
				glPushMatrix();
					pt_mv_world_vbo.glMultModelView();
					//
					vbo->setProg(prog_vbo_scm);
					vbo->render(GL_TRIANGLES, indexBuffer);
				glPopMatrix();
			}

			/**/
			{
				// MODEL_SPACE -> WORLD_SPACE
				const ProjTransfo pt_mv_world_spiral; // matrice identité
				prog_vbo_scm.setUniformMat4( "u_m4_modelview", pt_mv_world_spiral.coefs(), false);

				// MODEL_SPACE -> WORLD_SPACE -> LIGHT_SPACE_TEXTURE
				const ProjTransfo pt_mv_light = pt_world_light * pt_mv_world_spiral;
				prog_vbo_scm.setUniformMat4( "u_m4_mv_light", pt_mv_light.coefs(), false);

				const ProjTransfo pt_world_mv_spiral = pt_mv_world_spiral.inv();
				const Vec4 v4_mv_light_pos = pt_world_mv_spiral * v4_world_light_pos;
				prog_vbo_scm.setUniformVec4( "u_v4_mv_light_pos", v4_mv_light_pos, false);
		
				glPushMatrix();
					pt_mv_world_spiral.glMultModelView();
					// - Dessine la scene
					drawSpiral();
				glPopMatrix();
			}
			/**/

			/**/
			{
				// MODEL_SPACE -> WORLD_SPACE
				const ProjTransfo pt_mv_world_plane =
						ProjTransfo::rotation( -(M_PI/2), Vec3(1, 0 , 0), true )
						* ProjTransfo::scaling( Vec3(5, 5, 1) )
						* ProjTransfo::translation( Vec3(-0.5, -0.5, -1) );
				prog_vbo_scm.setUniformMat4( "u_m4_modelview", pt_mv_world_plane.coefs(), false);

				// MODEL_SPACE -> WORLD_SPACE -> LIGHT_SPACE_TEXTURE
				const ProjTransfo pt_mv_light = pt_world_light * pt_mv_world_plane;
				prog_vbo_scm.setUniformMat4( "u_m4_mv_light", pt_mv_light.coefs(), false);

				const ProjTransfo pt_world_mv_plane = pt_mv_world_plane.inv();
				const Vec4 v4_mv_light_pos = pt_world_mv_plane * v4_world_light_pos;
				prog_vbo_scm.setUniformVec4( "u_v4_mv_light_pos", v4_mv_light_pos, false);

				glPushAttrib(GL_ALL_ATTRIB_BITS);
					glDisable(GL_CULL_FACE);
					glPushMatrix();
						pt_mv_world_plane.glMultModelView();
						//
						glColor3f(1, 1, 1);
						glBegin(GL_QUADS);
							glNormal3f(0, 0, 1);	glVertex3f(0, 0, 0);
							glNormal3f(0, 0, 1);	glVertex3f(1, 0, 0);
							glNormal3f(0, 0, 1);	glVertex3f(1, 1, 0);
							glNormal3f(0, 0, 1);	glVertex3f(0, 1, 0);
						glEnd();
					glPopMatrix();
				glPopAttrib();
			}
			/**/
		}
		prog_vbo_scm.deactivate();
	
		glPopAttrib(); // VIEWPORT_BITS

	// - desactive le framebuffer
	_framebuffer.deactivate();
	
	MSG_CHECK_GL;
}

#endif
