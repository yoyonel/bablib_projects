#ifndef __HELPER_VIEWER_DRAW__
#define __HELPER_VIEWER_DRAW__

//
void Viewer::drawScene() 
{	
	// -- récupération des dimensions des textures	
	ViewportGL viewport;
	viewport.getGL();
	
	const Vec2 v2_screen_size( viewport.w, viewport.h );
	const Vec2 v2_scm_size( tex_shadow_clipmap_current.getWidth(), tex_shadow_clipmap_current.getHeight() );

	prog_draw_scene_with_scm.activate();
	prog_draw_scene_with_scm.activateTextures();
	{
		prog_draw_scene_with_scm.setUniformVec2( "v2_screen_size", 	v2_screen_size, false );
		prog_draw_scene_with_scm.setUniformVec2( "v2_scm_size", 	v2_scm_size, 	false );
		
		// - draw scene
		drawSpiral();

		// - receiver plane
		glPushAttrib(GL_ALL_ATTRIB_BITS);
		glDisable(GL_LIGHTING);
		glDisable(GL_CULL_FACE);	
		glPushMatrix();
		glRotatef(-90, 1, 0, 0);
		glScalef( 5, 5, 1 );
		glTranslatef( -0.5, -0.5, -1);
		glColor3f(1, 1, 1);
		glBegin(GL_QUADS);
			glVertex3f(0, 0, 0);
			glVertex3f(1, 0, 0);	
			glVertex3f(1, 1, 0);
			glVertex3f(0, 1, 0);		
		glEnd();
		glPopMatrix();
		glPopAttrib();
	}
	prog_draw_scene_with_scm.deactivate();
	
	vbo->setProg( prog_draw_scene_with_scm );
	prog_draw_scene_with_scm.activate();
	{
		prog_draw_scene_with_scm.setUniformVec2( "v2_screen_size", 	v2_screen_size, false );
		prog_draw_scene_with_scm.setUniformVec2( "v2_scm_size", 	v2_scm_size, 	false );
		glPushMatrix();
			glScalef( f_scale_vbo, f_scale_vbo, f_scale_vbo );
			glMultMatrixd(qgl_mf_vbo.worldMatrix());
			vbo->render(GL_TRIANGLES, indexBuffer);
		glPopMatrix();
	}
	prog_draw_scene_with_scm.deactivate();
}
	
// Draws a spiral
void Viewer::drawSpiral()
{
	glPushAttrib(GL_ALL_ATTRIB_BITS);
	glDisable(GL_LIGHTING);
	glDisable(GL_CULL_FACE);	

	const float nbSteps = 200.0;

	glBegin(GL_QUAD_STRIP);
	for (int i=0; i<nbSteps; ++i)
	{
		const float ratio = i/nbSteps;
		const float angle = 21.0*ratio;
		const float c = cos(angle);
		const float s = sin(angle);
		const float r1 = 1.0 - 0.8f*ratio;
		const float r2 = 0.8f - 0.8f*ratio;
		const float alt = ratio - 0.5f;
		const float nor = 0.5f;
		const float up = sqrt(1.0-nor*nor);
		glColor3f(1.0-ratio, 0.2f , ratio);
		glNormal3f(nor*c, up, nor*s);
		glVertex3f(r1*c, alt, r1*s);
		glVertex3f(r2*c, alt+0.05f, r2*s);
	}
	glEnd();

	glPopAttrib();
}

void Viewer::setOpenGLStates()
{
	// Activation du Depth buffer
	glEnable(GL_DEPTH_TEST);
	glDepthFunc(GL_LEQUAL);
	glDepthMask(GL_TRUE);
	// Desactivation du Blending (on sait jamais :p)
	glDisable(GL_BLEND);

	// Activation du backface culling
	glEnable(GL_CULL_FACE);
	glCullFace(GL_BACK);	  	
}

void Viewer::drawQuad(float sz, float texc)
{	
	const float data_T2F_V3F[][5] = {	
		{ 0.0f, 0.0f, 0.0f, 0.0f, 0.0f }, 
		{ texc, 0.0f, sz, 0.0f, 0.0f }, 
		{ texc, texc, sz, sz, 0.0f }, 
		{ 0.0f, texc, 0.0f, sz, 0.0f } 
	};	

	glInterleavedArrays(GL_T2F_V3F, 0, data_T2F_V3F);
	glDrawArrays(GL_QUADS, 0, 4);
}

void Viewer::drawTexture( int x, int y, int w, int h, ProgGLSL& _prog) {	
	glPushAttrib(GL_VIEWPORT_BIT);	

	glMatrixMode(GL_MODELVIEW);
	glPushMatrix();
	glLoadIdentity();

	glMatrixMode(GL_PROJECTION);
	glPushMatrix();
	glLoadIdentity();
	glOrtho(0.0, 1.0, 0.0, 1.0, -1.0, 1.0);					

	glViewport(x, y, w, h);

	// - active le shader et la texture associee
	_prog.activate();
	_prog.activateTextures();
		float tex_width = texture_active.getWidth();
		float tex_height = texture_active.getHeight();
		prog_draw_texture.setUniform( "tex_width",  tex_width, false );
		prog_draw_texture.setUniform( "tex_height", tex_height, false );
	
		glPushAttrib(GL_ALL_ATTRIB_BITS);
			glDisable(GL_DEPTH_TEST);
			drawQuad(1.0);
		glPopAttrib();
	// - desactive le shader et la texture associee
	_prog.deactivate();

	// - restaure les matrices OpenGL
	glMatrixMode(GL_PROJECTION);
	glPopMatrix();
	glMatrixMode(GL_MODELVIEW);
	glPopMatrix();

	// - restaure les attributs
	glPopAttrib();		
}

void Viewer::drawLightCamera( float _fCoef_Alpha )
{
	glPushAttrib(GL_ALL_ATTRIB_BITS);
	// Disable Culling
	glDisable(GL_CULL_FACE);
	// Enable semi-transparent culling planes
  	glEnable(GL_BLEND);
  	glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);
	glDisable(GL_LIGHTING);
	glDepthMask(GL_FALSE);
  	glLineWidth(4.0);
  	glColor4f(1.0, 1.0, 1.0, _fCoef_Alpha );
  	// Draws the light's camera
	qgl_cam_light.draw();
	// restore OpenGL attributes
	glPopAttrib();
}

void Viewer::drawTextures()
{
	tex_shadow_map.bind();
	glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_COMPARE_MODE, GL_NONE);
	
	texture_active = tex_shadow_map;
	drawTexture( 0, 0, 128, 128, prog_draw_texture );	
	
	// -
	texture_active = tex_shadow_clipmap[INVERT_RW(eCurrentFrame)];
	drawTexture( 128, 0, 128, 128, prog_draw_texture );		
}

#endif
