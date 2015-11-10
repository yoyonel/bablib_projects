#define M_PI                            3.14159
#define MAX_VERTICES_IN_LIGHT_SOURCE    4

#define IS_ODD(x) ( floor(float(x)/2.0)*2.0 < float(x) )

float cosine_sine_power_integral_sum(in float theta,in float cos_theta,in float sin_theta,in int n,in float a,in float b);
void seg_plane_intersection(in vec3 v0,in vec3 v1,in vec3 n,out vec3 q);
float shd_edge_contribution(in vec3 v0,in vec3 v1,in vec3 n,in int e);
float shd_polygonal(in int nv,in vec3 v[MAX_VERTICES_IN_LIGHT_SOURCE],in vec3 p,in vec3 n,int e);

/*
--------------------------------------------------------------------------------
cosine_sine_power_integral_sum
Computes the sum
Tsum(theta,n,a,b) = Sum_{i=0}ˆ{n/2} T(theta,2i,a,b), if n is even
Sum_{i=0}ˆ{(n-1)/2} T(theta,2i+1,a,b), if n is odd
where the function T is defined as
T(theta,n,a,b) = integral( [a cos(theta) + b sin(theta)]ˆn d theta )
and where T(0,n,a,b) = 0 (i.e., integral is from 0 to theta).
The recurrence relation is
T(theta,n,a,b) = 1/n [ (a sin(theta) - b cos(theta)) (a cos(theta) + b sin(theta))ˆ(n-1) +
aˆ(n-1) b + (n-1) (aˆ2 + bˆ2) T(theta,n-2,a,b) ]
--------------------------------------------------------------------------------
*/
float cosine_sine_power_integral_sum(in float theta,in float cos_theta,in float sin_theta,in int n,in float a,in float b)
{
    float f = a*a + b*b;
    float g = a*cos_theta + b*sin_theta;
    float gsq = g*g;
    float asq = a*a;
    float h = a*sin_theta - b*cos_theta;
    float T,Tsum;
    float l,l2;
    int i,start;
    /* initial conditions for recurrence */
    if (IS_ODD(n)) { /* n is odd */
        T = h+b;
        l = gsq*h;
        l2 = b*asq;
        start = 1;
    } else { /* n is even */
        T = theta;
        l = g*h;
        l2 = b*a;
        start = 0;
    }
    Tsum = T;
    /* iterate recurrence upward */
    for (i = start+2; i <= n; i += 2) {
        /* compute T(i) from T(i-2) */
        T = (l + l2 + f*(float(i)-1.0)*T)/float(i);
        l *= gsq;
        l2 *= asq;
        Tsum += T;
    }
    return Tsum;
}

/*
Finds point on line segment where the segment intersects a plane through the origin.
The plane is specified by a normal n. The line
segment is specified by two points: v0 and v1. The point of intersection
is returned in q. The segment is assumed to intersect the plane.
*/
void seg_plane_intersection(in vec3 v0,in vec3 v1,in vec3 n,out vec3 q)
{
    vec3 vd;
    float t;
    vd = v1 - v0;
    t = -dot(v0,n) / dot(vd,n);
    q = v0 + t*vd;
}

/*
Computes the contribution from a single edge.
*/
float shd_edge_contribution(in vec3 v0,in vec3 v1,in vec3 n,in int e)
{
    float f;
    float cos_theta,sin_theta;
    vec3 q;
    q = cross(v0,v1);
    sin_theta = length(q);
    q = normalize(q);
    cos_theta = dot(v0,v1);
    if (e == 1) {
        f = acos(cos_theta);
    } else {
        vec3 w;
        float theta;
        theta = acos(cos_theta);
        w = cross(q,v0);
        f = cosine_sine_power_integral_sum(theta,cos_theta,sin_theta,e-1,dot(v0,n),dot(w,n));
    }
    return f*dot(q,n);
}

/*
    Computes the surface integral over the solid angle subtended by a polygon as seen
    from the point p in the direction n of
     max(0,dot(n,l))ˆe dl
    where l is the projection of the light polygon into the hemisphere surrounding p
    with zenith direction n, and e is an exponent (1 for diffuse shading, > 1 for specular).

    nv -- number of vertices in light source
    v -- array of light source vertices
    p -- point to be illuminated
    n -- direction of hemisphere zenith (unit vector)
    e -- exponent
*/
float shd_polygonal(in int nv,in vec3 v[MAX_VERTICES_IN_LIGHT_SOURCE],in vec3 p,in vec3 n,int e)
{
    int i,j,i1;
    float sum = 0.0;
    vec3 ui0,ui1; /* unnormalized vertices of edge */
    vec3 vi0,vi1; /* unit-length vector vertices of edge */
    bool belowi0,belowi1; /* flag for whether last vertex was below point’s "horizon" */

    /* find first vertex above horizon */
    for (j = 0; j < nv; j++) {
        vec3 u;
        u = v[j] - p;
        if (dot(u,n) >= 0.0) {
            ui0 = u;
            vi0 = u;
            vi0 = normalize(vi0);
            belowi0 = false;
            break;
        }
    }

    if (j >= nv) return 0.0; /* whole polygon is below horizon */

    /* make exponent odd */
    if (e != 1 && !IS_ODD(e)) e = e+1;

    /* loop through edges of polygonal light source */
    i1 = j;
    for (i = 0; i < nv; i++) {
        /* next edge to process goes from v[(i+j)%nv] to v[(i+j+1)%nv] */
        i1++;
        if (i1 >= nv) i1 = 0;
        /* compute next vertex */
        ui1 = v[i1] - p;
        belowi1 = (dot(ui1,n) < 0.0);
        if (!belowi1) {
            vi1 = ui1;
            vi1 = normalize(vi1);
       }
        if (belowi0 && !belowi1) {
            vec3 vinter;
            /* edge arises from horizon */
            /* find intersection with horizon */
            seg_plane_intersection(ui0,ui1,n,vinter);
            vinter = normalize(vinter);
            /* add contribution from last vertex to intersection */
            /* don’t need to add for exponents > 1 since
            contribution is 0 on boundary for such exponents */
            sum += shd_edge_contribution(vi0,vinter,n,1);
            vi0 = vinter;
        } else if (!belowi0 && belowi1) {
            /* edge dives below horizon */
            /* find intersection wth horizon */
            seg_plane_intersection(ui0,ui1,n,vi1);
            vi1 = normalize(vi1);
        }
        /* compute contribution from edge */
        if (!belowi0 || !belowi1) sum += shd_edge_contribution(vi0,vi1,n,e);
        /* set next iteration’s starting vertex to this iteration’s ending vertex */
        ui0 = ui1;
        vi0 = vi1;
        belowi0 = belowi1;
    }

    if (sum < 0.0) sum = -sum; /* integrate around boundary in the right direction. If negative, it was wrong. */

    return sum/(2.0*M_PI);
}
