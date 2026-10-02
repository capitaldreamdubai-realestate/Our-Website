import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { descriptionHtmlToPdf } from '@/lib/propertyBrochure/descriptionToPdf'

const ink = '#1c1412'
const terracotta = '#a67d32'
const cream = '#f8f3ef'

const styles = StyleSheet.create({
  page: {
    backgroundColor: cream,
    color: ink,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 36,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e4d7c8',
    paddingBottom: 12,
    marginBottom: 16,
  },
  brand: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    letterSpacing: 1.2,
    color: terracotta,
  },
  kicker: {
    fontSize: 8,
    letterSpacing: 1.4,
    color: '#6d625c',
    marginTop: 3,
  },
  logo: {
    width: 92,
    height: 28,
    objectFit: 'contain',
  },
  highlight: {
    fontSize: 9,
    letterSpacing: 1.1,
    color: terracotta,
    marginBottom: 8,
  },
  title: {
    fontFamily: 'Times-Bold',
    fontSize: 22,
    lineHeight: 1.2,
    color: ink,
  },
  price: {
    marginTop: 8,
    fontFamily: 'Helvetica-Bold',
    fontSize: 14,
    color: terracotta,
  },
  meta: {
    marginTop: 4,
    fontSize: 10,
    color: '#4a403c',
  },
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 13,
    color: terracotta,
    marginTop: 16,
    marginBottom: 8,
  },
  snapshot: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  snapshotItem: {
    width: '33%',
    marginBottom: 8,
    paddingRight: 8,
  },
  snapshotLabel: {
    fontSize: 8,
    letterSpacing: 0.8,
    color: '#6d625c',
    textTransform: 'uppercase',
  },
  snapshotValue: {
    marginTop: 2,
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: ink,
  },
  gallery: {
    marginTop: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  photo: {
    width: '48%',
    height: 140,
    objectFit: 'cover',
    marginBottom: 10,
    marginRight: '2%',
  },
  hero: {
    width: '100%',
    height: 220,
    objectFit: 'cover',
    marginTop: 12,
    marginBottom: 8,
  },
  location: {
    fontSize: 11,
    lineHeight: 1.4,
    color: ink,
  },
  map: {
    marginTop: 8,
    width: '100%',
    height: 160,
    objectFit: 'cover',
  },
  agent: {
    marginTop: 8,
    flexDirection: 'row',
  },
  agentPhoto: {
    width: 72,
    height: 72,
    objectFit: 'cover',
  },
  agentName: {
    fontFamily: 'Times-Bold',
    fontSize: 14,
    color: ink,
  },
  agentLine: {
    marginTop: 2,
    fontSize: 10,
    color: '#4a403c',
  },
  footer: {
    position: 'absolute',
    left: 36,
    right: 36,
    bottom: 18,
    borderTopWidth: 1,
    borderTopColor: '#e4d7c8',
    paddingTop: 6,
    fontSize: 8,
    color: '#6d625c',
    lineHeight: 1.35,
  },
})

export type BrochureSnapshotItem = {
  label: string
  value: string
}

export type BrochureAgent = {
  name: string
  title: string
  photo: string | null
  phone: string
  whatsapp: string
  email: string
  agencyName: string
  brokerLicense: string
}

export type PropertyBrochureProps = {
  title: string
  highlight: string
  priceText: string
  listingType: string
  propertyType: string
  reference: string
  snapshot: BrochureSnapshotItem[]
  descriptionHtml: string
  images: string[]
  locationText: string
  mapImage: string | null
  logo: string | null
  agent: BrochureAgent | null
}

export function PropertyBrochureDocument({
  title,
  highlight,
  priceText,
  listingType,
  propertyType,
  reference,
  snapshot,
  descriptionHtml,
  images,
  locationText,
  mapImage,
  logo,
  agent,
}: PropertyBrochureProps) {
  const copy = descriptionHtmlToPdf(descriptionHtml)
  const [hero, ...rest] = images

  return (
    <Document title={`${title} — Capital Dream`} author="Capital Dream">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>CAPITAL DREAM PROPERTY DETAILS</Text>
            <Text style={styles.kicker}>PERSONALISED PROPERTY BROCHURE</Text>
          </View>
          {logo ? <Image src={logo} style={styles.logo} /> : null}
        </View>

        {highlight ? <Text style={styles.highlight}>{highlight}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.price}>{priceText}</Text>
        <Text style={styles.meta}>
          {[propertyType, listingType, reference ? `Ref ${reference}` : '']
            .filter(Boolean)
            .join('  ·  ')}
        </Text>

        {hero ? <Image src={hero} style={styles.hero} /> : null}

        {snapshot.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Property snapshot</Text>
            <View style={styles.snapshot}>
              {snapshot.map((item) => (
                <View key={item.label} style={styles.snapshotItem}>
                  <Text style={styles.snapshotLabel}>{item.label}</Text>
                  <Text style={styles.snapshotValue}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {copy.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Property details</Text>
            {copy}
          </View>
        ) : null}

        {rest.length > 0 ? (
          <View>
            <Text style={styles.sectionTitle}>Property gallery</Text>
            <View style={styles.gallery}>
              {rest.map((src) => (
                <Image key={src} src={src} style={styles.photo} />
              ))}
            </View>
          </View>
        ) : null}

        <View>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.location}>{locationText}</Text>
          {mapImage ? <Image src={mapImage} style={styles.map} /> : null}
        </View>

        <View>
          <Text style={styles.sectionTitle}>Your property consultant</Text>
          {agent ? (
            <View style={styles.agent}>
              {agent.photo ? <Image src={agent.photo} style={styles.agentPhoto} /> : null}
              <View style={{ flex: 1, marginLeft: agent.photo ? 12 : 0 }}>
                <Text style={styles.agentName}>{agent.name}</Text>
                {agent.title ? <Text style={styles.agentLine}>{agent.title}</Text> : null}
                {agent.agencyName ? (
                  <Text style={styles.agentLine}>Agency: {agent.agencyName}</Text>
                ) : null}
                {agent.brokerLicense ? (
                  <Text style={styles.agentLine}>Broker license: {agent.brokerLicense}</Text>
                ) : null}
                {agent.phone ? <Text style={styles.agentLine}>Call: {agent.phone}</Text> : null}
                {agent.whatsapp ? (
                  <Text style={styles.agentLine}>WhatsApp: {agent.whatsapp}</Text>
                ) : null}
                {agent.email ? <Text style={styles.agentLine}>Email: {agent.email}</Text> : null}
              </View>
            </View>
          ) : (
            <Text style={styles.location}>
              Capital Dream · Info@capitaldreamdubai.com · +971 50 108 3541
            </Text>
          )}
          <Text style={[styles.agentLine, { marginTop: 8 }]}>
            Website: capitaldreamdubai.com
          </Text>
        </View>

        <Text style={styles.footer}>
          Disclaimer: Property information, availability, pricing, images and other details are
          subject to change and should be independently verified. This brochure is generated
          automatically from the Capital Dream website listing. capitaldreamdubai.com ·
          Info@capitaldreamdubai.com · +971 50 108 3541
          {mapImage ? '  Map data © OpenStreetMap contributors.' : ''}
        </Text>
      </Page>
    </Document>
  )
}

export function brochureFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${slug || 'property'}-capital-dream.pdf`
}
