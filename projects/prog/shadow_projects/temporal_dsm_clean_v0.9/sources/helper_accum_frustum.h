#ifndef __HELPER_ACCUM_FRUSTUM_H__
#define __HELPER_ACCUM_FRUSTUM_H__

#include <GL/gl.h>	// for: gl functions
#include <math.h>	// for: sinf, cosf, M_PI

const double jitter16[16][2] = {
		{0.375, 0.4375}, {0.625, 0.0625}, {0.875, 0.1875}, {0.125, 0.0625},

		{0.375, 0.6875}, {0.875, 0.4375}, {0.625, 0.5625}, {0.375, 0.9375},

		{0.625, 0.3125}, {0.125, 0.5625}, {0.125, 0.8125}, {0.375, 0.1875},

		{0.875, 0.9375}, {0.875, 0.6875}, {0.125, 0.3125}, {0.625, 0.8125} 
	};

/* accFrustum()
 * The first 6 arguments are identical to the glFrustum() call.
 *  
 * pixdx and pixdy are anti-alias jitter in pixels. 
 * Set both equal to 0.0 for no anti-alias jitter.
 * eyedx and eyedy are depth-of field jitter in pixels. 
 * Set both equal to 0.0 for no depth of field effects.
 *
 * focus is distance from eye to plane in focus. 
 * focus must be greater than, but not equal to 0.0.
 *
 * Note that accFrustum() calls glTranslatef().  You will 
 * probably want to insure that your ModelView matrix has been 
 * initialized to identity before calling accFrustum().
 */
void accFrustum(
	const GLdouble _left, GLdouble _right, GLdouble _bottom,
    	const GLdouble _top, GLdouble _near, GLdouble _far, 
	const GLdouble _pixdx, GLdouble _pixdy, 
	const GLdouble _eyedx, GLdouble _eyedy, 
    	const GLdouble _focus
	)
{
    GLdouble xwsize, ywsize; 
    GLdouble dx, dy;
    GLint viewport[4];

    glGetIntegerv (GL_VIEWPORT, viewport);

    xwsize = _right - _left;
    ywsize = _top - _bottom;
    dx = -(_pixdx*xwsize/(GLdouble) viewport[2] + _eyedx*_near/_focus);	
    dy = -(_pixdy*ywsize/(GLdouble) viewport[3] + _eyedy*_near/_focus);

    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
	
    glFrustum (
		_left + dx, _right + dx, 
		_bottom + dy, _top + dy, 
        _near, _far
	);	
	
    //glMatrixMode(GL_MODELVIEW);
    //glLoadIdentity();
    //glTranslatef (-eyedx, -eyedy, 0.0);
}

/* accPerspective()
 * 
 * The first 4 arguments are identical to the gluPerspective() call.
 * pixdx and pixdy are anti-alias jitter in pixels. 
 * Set both equal to 0.0 for no anti-alias jitter.
 * eyedx and eyedy are depth-of field jitter in pixels. 
 * Set both equal to 0.0 for no depth of field effects.
 *
 * focus is distance from eye to plane in focus. 
 * focus must be greater than, but not equal to 0.0.
 *
 * Note that accPerspective() calls accFrustum().
 */
void accPerspective(
	const GLdouble _fovy, GLdouble _aspect, 
    	const GLdouble _near, GLdouble _far, 
	const GLdouble _pixdx, GLdouble _pixdy, 
    	const GLdouble _eyedx, GLdouble _eyedy, 
	const GLdouble _focus
	)
{
    GLdouble fov2,left,right,bottom,top;
    fov2 = _fovy / 2.0;

    top = _near / (cosf(fov2) / sinf(fov2));
    bottom = -top;
    right = top * _aspect;
    left = -right;

    accFrustum (
		left, right, bottom, top, _near, _far,
        _pixdx, _pixdy, 
		_eyedx, _eyedy, 
		_focus
	);
}

/*
 * @(#)HaltonSequence.java  1.0 30 November 2002
 *
 * (C) Copyright Carlo Vicentini, 2002 - All Rights Reserved
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA  02111-1307  USA
 *
 */
 
class HaltonSequence {

    /**
     * Assert whether the argument is a prime number.
     * @param number the number to be checked
     */
    private:
	bool isPrime(int number) {
		bool isIt = true;
		for(int i = 2; i < number; i++) {
		    if(number % i == 0) {
		        isIt = false;
		        break;
		    }
		}
		if(number == 2) {
		    isIt = false;
		}
		return isIt;
	    }
    
    /**
     * Find the nth prime number.
     * @param index the ordinal position in the sequence
     */
     int findPrime(int index) {
        int prime = 1;
        int found = 1;
        while(found != index) {
            prime += 2;
            if(isPrime(prime) == true) {
                found++;
            }
        }
        return prime;
    }
    
    /**
     * Returns the nth number in the sequence, taken from a specified dimension.
     * @param index the ordinal position in the sequence
     * @param dimension the dimension
     */
    public:
	double getNumber(int index, int dimension) {

		int base = findPrime(dimension);

		if(base == 1) {
		    base++;  //The first dimension uses base 2.
		} 

		double remainder;
		double output = 0.0;
		double fraction = 1.0 / (double)base;

		int N1 = 0;
		int copyOfIndex = index;
		if(base >= 2 && index >= 1) {
		    while(copyOfIndex > 0) {
		        N1 = (copyOfIndex / base);
		        remainder = copyOfIndex % base;
		        output += fraction * remainder;
		        copyOfIndex = (int)(copyOfIndex / base);
		        fraction /= (double)base;
		    } 		    
		}
		return output;
    }
};
			
#endif
